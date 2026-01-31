<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

use App\Models\LawyerEarning;
use App\Models\LawyerProfile;
use App\Models\LawyerOffice;
use App\Models\LawyerAchievement;
use App\Models\LawyerVerification;
use App\Models\Appointment;
use App\Traits\HasNotifications;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Traits\HasAuditLog;

/**
 * Class LawyerManagementController
 * * Handles all lawyer-specific administrative tasks including profile management, 
 * office locations, achievements, identity verification (KYC), and financial statistics.
 * * @package App\Http\Controllers\Api
 */
class LawyerManagementController extends Controller
{
    use HasAuditLog;
    use HasNotifications;

    /**
     * Update the lawyer's personal profile information.
     * * Allows updating bio, experience, contact details, and profile image. 
     * Also synchronizes many-to-many relationships with specializations.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $validator = Validator::make($request->all(), [
            'fullname'             => 'sometimes|required|string|max:100',
            'phonenumber'          => 'sometimes|required|string|max:20',
            'experienceyears'      => 'sometimes|nullable|integer|min:0',  
            'bio'                  => 'sometimes|nullable|string',
            'profileimage'         => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:8192',
            'specialization_ids'   => 'sometimes|nullable|array',
            'specialization_ids.*' => 'exists:specializations,specid',
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        DB::beginTransaction();
        try {
            $profile = LawyerProfile::where('lawyerid', $user->userid)->firstOrFail();

            $updateData = [];

            if ($request->has('fullname'))        $updateData['fullname'] = $request->fullname;
            if ($request->has('phonenumber'))     $updateData['phonenumber'] = $request->phonenumber;
            if ($request->has('experienceyears')) $updateData['experienceyears'] = $request->experienceyears;
            if ($request->has('bio'))             $updateData['bio'] = $request->bio;

            if ($request->hasFile('profileimage')) {
                if ($profile->profileimage && Storage::disk('public')->exists($profile->profileimage)) {
                    Storage::disk('public')->delete($profile->profileimage);
                }

                $file = $request->file('profileimage');
                $filename = time() . '_' . $user->userid . '_avatar.' . $file->getClientOriginalExtension();
                $imagePath = $file->storeAs('lawyer_avatars', $filename, 'public');

                $updateData['profileimage'] = $imagePath;
            }

            $profile->update($updateData);

            if ($request->has('specialization_ids')) {
                $profile->specializations()->sync($request->specialization_ids);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully.',
                'data' => $profile->load('specializations')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'System error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update the lawyer's office location details.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateOffice(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $currentOffice = LawyerOffice::where('lawyerid', $user->userid)->first();

        $rules = [
            'locid'         => 'required|exists:locations,locid',
            'addressdetail' => 'required|string|max:255',
        ];

        if ($currentOffice) {
            $rules['lawyerid'] = 'unique:lawyer_offices,lawyerid,' . $currentOffice->officeid . ',officeid';
        } else {
            $rules['lawyerid'] = 'unique:lawyer_offices,lawyerid';
        }

        $validator = Validator::make(
            array_merge($request->all(), ['lawyerid' => $user->userid]),
            $rules
        );

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        try {
            $office = LawyerOffice::updateOrCreate(
                ['lawyerid' => $user->userid],
                [
                    'locid'         => $request->locid,
                    'addressdetail' => $request->addressdetail,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Office information updated successfully.',
                'data' => $office
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'System error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Add a new professional achievement or certification to the lawyer's record.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function addAchievement(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate(['title' => 'required|string|max:255']);

        $achievement = LawyerAchievement::create([
            'lawyerid' => $user->userid,
            'title'    => $request->title,
        ]);

        return response()->json(['success' => true, 'message' => 'Achievement added successfully.', 'data' => $achievement]);
    }

    /**
     * Delete a specific achievement record.
     *
     * @param  int  $id The Achievement ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteAchievement($id)
    {
        $achievement = LawyerAchievement::where('achieveid', $id)
            ->where('lawyerid', Auth::id())
            ->first();

        if (!$achievement) return response()->json(['message' => 'Achievement not found.'], 404);

        $achievement->delete();
        return response()->json(['success' => true, 'message' => 'Achievement deleted successfully.']);
    }

    /**
     * Submit identification and licensing documents for admin verification.
     * * Handles file uploads and sets status to 'Pending' (for new users) 
     * or 'Updating' (for existing verified users).
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function submitVerification(Request $request)
    {
        $user = Auth::user();

        $validator = Validator::make($request->all(), [
            'idcardnumber'     => 'required|string|min:5|max:20',
            'licensenumber'    => 'required|string|min:5|max:20',
            'documentimages'   => 'required|array|min:1',
            'documentimages.*' => 'mimes:jpeg,png,jpg,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            if ($request->hasFile('documentimages')) {
                $docPaths = [];

                foreach ($request->file('documentimages') as $index => $file) {
                    $filename = time() . '_' . $user->userid . '_verify_' . $index . '.' . $file->getClientOriginalExtension();
                    $path = $file->storeAs('verifications', $filename, 'public');
                    $docPaths[] = $path;
                }

                $hasApprovedRecord = LawyerVerification::where('lawyerid', $user->userid)
                    ->where('status', 'Approved')->exists();
                $newStatus = $hasApprovedRecord ? 'Updating' : 'Pending';

                $verification = LawyerVerification::create([
                    'lawyerid'      => $user->userid,
                    'idcardnumber'  => $request->idcardnumber,
                    'licensenumber' => $request->licensenumber,
                    'documentimage' => $docPaths,
                    'status'        => $newStatus
                ]);

                $this->sendNotification(
                    $user->userid,
                    "Your verification documents have been submitted successfully. Status: {$newStatus}."
                );

                $admins = User::where('roleid', 1)->get();
                foreach ($admins as $admin) {
                    $this->sendNotification(
                        $admin->userid,
                        "New verification request submitted by Lawyer #{$user->userid}.",
                        "/admin/pending"
                    );
                }

                $msg = $hasApprovedRecord
                    ? 'Update request submitted. Your current profile remains active.'
                    : 'Verification documents submitted successfully. Please wait for admin approval.';

                return response()->json(['success' => true, 'message' => $msg]);
            }
            return response()->json(['message' => 'Please select at least one file.'], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'System error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Retrieve financial performance and appointment statistics for the dashboard.
     * * Calculates monthly revenue based on an 80/20 lawyer-platform split
     * after a theoretical 10% tax adjustment.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDashboardStats(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $month = $request->input('month', date('m'));
        $year  = $request->input('year', date('Y'));

        $earning = LawyerEarning::where('lawyerid', $user->userid)->first();
        $totalCumulativeRevenue = $earning ? $earning->totalcommissionpaid : 0;
        $totalCumulativeMatches = $earning ? $earning->totalmatches : 0;

        $countPending = Appointment::where('lawyerid', $user->userid)->where('status', 'Pending')->count();
        $countCurrentMonthCompleted = Appointment::where('lawyerid', $user->userid)
            ->where('status', 'Completed')
            ->whereMonth('updated_at', $month)
            ->whereYear('updated_at', $year)
            ->count();

        $completedAppointments = Appointment::where('lawyerid', $user->userid)
            ->where('status', 'Completed')
            ->whereMonth('updated_at', $month)
            ->whereYear('updated_at', $year)
            ->with(['customer', 'invoice'])
            ->orderBy('updated_at', 'desc')
            ->get();

        $monthlyRevenue = 0;
        $transactions = [];

        foreach ($completedAppointments as $app) {
            $invoiceAmount = $app->invoice ? $app->invoice->amount : 0;
            $basePrice = $invoiceAmount / 1.1;
            $displayCommission = $basePrice * 0.2;
            $lawyerEarned = $basePrice * 0.8;
            $monthlyRevenue += $lawyerEarned;
            $transactions[] = [
                'id'            => $app->appointid,
                'customer_name' => $app->customer ? $app->customer->fullname : 'Unknown',
                'package'       => $app->packagename,
                'date'          => $app->starttime,
                'completed_at'  => $app->updated_at,
                'total_paid'    => round($basePrice, 2),
                'platform_fee'  => round($displayCommission, 2),
                'lawyer_income' => round($lawyerEarned, 2)
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_cumulative_revenue' => $totalCumulativeRevenue,
                'total_cumulative_matches' => $totalCumulativeMatches,
                'monthly_revenue' => $monthlyRevenue,
                'count_pending'   => $countPending,
                'count_completed' => $countCurrentMonthCompleted,
                'transactions'    => $transactions,
                'month' => $month,
                'year'  => $year
            ]
        ]);
    }

    /**
     * Delete a verification request and its associated files.
     * * Restricted: Cannot delete requests that have already been 'Approved'.
     *
     * @param  int  $id The Verification record ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteVerification($id)
    {
        $user = Auth::user();

        $verification = LawyerVerification::where('verifyid', $id)
            ->where('lawyerid', $user->userid)
            ->first();

        if (!$verification) {
            return response()->json(['message' => 'Document not found or access denied.'], 404);
        }

        if ($verification->status === 'Approved') {
            return response()->json(['message' => 'Cannot delete an approved verification record.'], 403);
        }

        try {
            $files = $verification->documentimage;

            if (is_array($files)) {
                foreach ($files as $file) {
                    if (Storage::disk('public')->exists($file)) {
                        Storage::disk('public')->delete($file);
                    }
                }
            }

            $verification->delete();

            return response()->json([
                'success' => true,
                'message' => 'Verification documents deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'System error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Bulk update service pricing (Min/Max) for all legal specialties associated with the lawyer.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateServicePrice(Request $request)
    {
        try {

            $validator = Validator::make($request->all(), [
                'specminprice' => 'required|numeric|min:0',
                'specmaxprice' => 'required|numeric|gte:specminprice',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors'  => $validator->errors()
                ], 422);
            }

            /** @var \App\Models\User $user */
            $user = $request->user();

            if (!$user || (int)$user->roleid !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Permission denied'
                ], 403);
            }

            DB::table('lawyer_specialties')
                ->where('lawyerid', $user->userid)
                ->update([
                    'specminprice' => $request->specminprice,
                    'specmaxprice' => $request->specmaxprice,
                    'updated_at'   => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Prices for all specialties have been updated successfully',
                'data' => [
                    'min_price' => $request->specminprice,
                    'max_price' => $request->specmaxprice
                ]
            ], 200);
        } catch (\Throwable $e) {
            Log::error('Update Price Bulk Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'System error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the authenticated lawyer's account password.
     * * Requires verification of the current password.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function changePassword(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user || (int)$user->roleid !== 2) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }


        $validator = Validator::make($request->all(), [
            'current_password' => 'required',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'The current password you entered is incorrect.'
                ], 400);
            }

            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            $this->logAction("Lawyer ID #{$user->userid} successfully changed their password.");

            return response()->json([
                'success' => true,
                'message' => 'Your password has been updated successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error("Change Password Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'A system error occurred while updating your password. Please try again later.'
            ], 500);
        }
    }
}
