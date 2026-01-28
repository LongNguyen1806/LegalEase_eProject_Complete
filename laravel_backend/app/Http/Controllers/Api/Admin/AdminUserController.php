<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\LawyerProfile;
use App\Models\LawyerVerification;
use App\Models\Appointment;
use App\Models\PaymentInvoice;
use App\Traits\HasAuditLog;
use Illuminate\Support\Facades\Storage;

/**
 * Handles administrative management of user accounts and lawyer verifications.
 *
 * This controller provides endpoints for listing users (Lawyers/Customers),
 * viewing detailed profiles, toggling account status (with automated appointment cancellation),
 * and processing lawyer verification documents.
 */
class AdminUserController extends Controller
{
    use HasAuditLog;

    /**
     * Retrieves a paginated list of users filtered by role.
     *
     * Performs complex joins to gather related data such as verification status,
     * subscription plans (for lawyers), and profile information. Supports keyword searching
     * against email and full names.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUsers(Request $request)
    {
        try {
            $roleId = $request->input('roleid', 2);
            $query = DB::table('users')->where('users.roleid', $roleId);

            $commonSelects = [
                'users.userid',
                'users.email',
                'users.roleid',
                'users.isactive',
                'users.created_at'
            ];

            if ($roleId == 2) {
                $query->leftJoin('lawyer_profiles', 'users.userid', '=', 'lawyer_profiles.lawyerid')
                    ->leftJoin('lawyer_verifications', function ($join) {
                        $join->on('users.userid', '=', 'lawyer_verifications.lawyerid')
                            ->whereRaw('lawyer_verifications.verifyid = (
                                SELECT MAX(verifyid) 
                                FROM lawyer_verifications as sub 
                                WHERE sub.lawyerid = lawyer_verifications.lawyerid
                            )');
                    })
                    ->leftJoin('lawyer_subscriptions', function ($join) {
                        $join->on('users.userid', '=', 'lawyer_subscriptions.lawyerid')
                            ->where('lawyer_subscriptions.status', '=', 'Active')
                            ->whereRaw('lawyer_subscriptions.subid = (
                                 SELECT MAX(sub.subid) 
                                 FROM lawyer_subscriptions as sub 
                                 WHERE sub.lawyerid = lawyer_subscriptions.lawyerid 
                                 AND sub.status = "Active"
                             )');
                    })
                    ->leftJoin('subscription_plans', 'lawyer_subscriptions.planid', '=', 'subscription_plans.planid');

                $query->select(array_merge($commonSelects, [
                    'lawyer_profiles.fullname',
                    'lawyer_profiles.profileimage',
                    'lawyer_verifications.status as verify_status',
                    'lawyer_profiles.isverified',
                    'subscription_plans.planname',
                    'lawyer_subscriptions.startdate',
                    'lawyer_subscriptions.enddate'
                ]));
            } else {
                $query->leftJoin('customer_profiles', 'users.userid', '=', 'customer_profiles.customerid');
                $query->select(array_merge($commonSelects, [
                    'customer_profiles.fullname',
                    DB::raw('NULL as profileimage'),
                    DB::raw('NULL as planname')
                ]));
            }

            if ($request->keyword) {
                $keyword = $request->keyword;
                $query->where(function ($q) use ($keyword, $roleId) {
                    $q->where('users.email', 'like', '%' . $keyword . '%');
                    if ($roleId == 2) {
                        $q->orWhere('lawyer_profiles.fullname', 'like', '%' . $keyword . '%');
                    } elseif ($roleId == 3) {
                        $q->orWhere('customer_profiles.fullname', 'like', '%' . $keyword . '%');
                    }
                });
            }

            $users = $query->orderBy('users.userid', 'desc')->paginate(10);
            return response()->json(['success' => true, 'data' => $users]);
        } catch (\Exception $e) {
            Log::error("GetUsers Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Retrieves comprehensive details for a specific user ID.
     *
     * For lawyers, this includes office locations, achievements, and formatted
     * URLs for verification documents. For customers, it returns standard profile data.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUserDetails($id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $formatImageUrl = function ($path, $folder) {
            if (!$path) return null;
            $cleanPath = str_contains($path, $folder) ? ltrim($path, '/') : $folder . '/' . ltrim($path, '/');
            return asset('storage/' . $cleanPath);
        };

        if ($user->roleid == 2) { 
            $user->load(['lawyerProfile']); 

            if ($user->lawyerProfile && $user->lawyerProfile->profileimage) {
                $user->lawyerProfile->profileimage = $formatImageUrl($user->lawyerProfile->profileimage, 'lawyer_avatars');
            }

            $offices = DB::table('lawyer_offices')
                ->join('locations', 'lawyer_offices.locid', '=', 'locations.locid')
                ->where('lawyerid', $user->userid)
                ->select('lawyer_offices.*', 'locations.cityname')
                ->get();

            $achievements = DB::table('lawyer_achievements')->where('lawyerid', $user->userid)->get();

            $specialties = DB::table('lawyer_specialties')
                ->join('specializations', 'lawyer_specialties.specid', '=', 'specializations.specid')
                ->where('lawyer_specialties.lawyerid', $user->userid)
                ->select('specializations.specname', 'lawyer_specialties.specminprice', 'lawyer_specialties.specmaxprice')
                ->get();

            $verifications = \App\Models\LawyerVerification::where('lawyerid', $user->userid)
                ->orderBy('verifyid', 'desc')
                ->get();

            $verifications->transform(function ($item) {
                $docs = $item->documentimage;

                $paths = is_array($docs) ? $docs : json_decode($docs, true);

                if (!is_array($paths)) {
                    $paths = !empty($docs) ? [$docs] : [];
                }

                $fullUrls = [];
                foreach ($paths as $path) {
                    if (!empty($path)) {
                        $fullUrls[] = asset('storage/' . ltrim($path, '/'));
                    }
                }
                $item->documentimage = $fullUrls;
                return $item;
            });

            $verification = $verifications->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'rolename' => 'Lawyer',
                    'profile' => $user->lawyerProfile,
                    'offices' => $offices,
                    'degrees' => $achievements,
                    'specialties' => $specialties,
                    'verification_status' => $verification ? $verification->status : 'Not Submitted',
                    'verifications' => $verifications
                ]
            ]);
        } elseif ($user->roleid == 3) { 
            $user->load('customerProfile'); 

            if ($user->customerProfile && $user->customerProfile->profileimage) {
                $user->customerProfile->profileimage = $formatImageUrl($user->customerProfile->profileimage, 'customer_avatars');
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'rolename' => 'Customer',
                    'profile' => $user->customerProfile
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => ['user' => $user, 'rolename' => 'Admin']
        ]);
    }
    /**
     * Toggles the active status of a user account.
     *
     * If an account is deactivated, this method automatically cancels any pending
     * or confirmed appointments and updates relevant invoice statuses (Refund_Pending/Cancelled)
     * to ensure system integrity.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleUserStatus($id)
    {
        DB::beginTransaction();
        try {
            $user = User::findOrFail($id);

            if ($user->userid == Auth::id()) {
                return response()->json(['message' => 'Cannot deactivate your own account.'], 400);
            }

            $willBeActive = !$user->isactive;

            if (!$willBeActive) {

                $appointmentsToCancel = Appointment::where('lawyerid', $user->userid)
                    ->whereIn('status', ['Pending', 'Confirmed'])
                    ->get();

                $countCancelled = 0;

                foreach ($appointmentsToCancel as $app) {
                    $invoice = PaymentInvoice::where('appointid', $app->appointid)->first();
                    if ($invoice) {
                        if ($invoice->status === 'Success') {
                            $invoice->status = 'Refund_Pending';
                            $invoice->save();
                        } else {
                            $invoice->status = 'Cancelled';
                            $invoice->save();
                        }
                    }

                    $app->status = 'Cancelled';
                    $app->note = $app->note . " | [SYSTEM]: Canceled because the account has been locked.";
                    $app->save();
                    $countCancelled++;
                }

                $this->logAction("Admin locked user {$user->email}. Auto-cancelled {$countCancelled} appointments.");
            } else {
                $this->logAction("Admin activated user {$user->email}.");
            }

            $user->isactive = $willBeActive;
            $user->save();

            DB::commit();

            $statusStr = $user->isactive ? 'Activated' : 'Deactivated';
            return response()->json([
                'success' => true,
                'message' => "User has been {$statusStr}. " . (!$willBeActive ? "Auto-cancelled {$countCancelled} appointments." : ""),
                'data' => $user
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Permanently delete a user account and associated profile data.
     * * @important Data Integrity Rules:
     * - Protects Admin accounts (roleid 1) from deletion.
     * - Enforces a "Safe Delete" policy: If a user has vital records (Appointments, 
     * QA activity, Reviews, or Payment Invoices), permanent deletion is blocked 
     * to preserve financial and system audit trails.
     * - Disposable Data Policy: Support data like AI Chat History and Notifications 
     * will be wiped during deletion to allow removal of inactive accounts.
     * * @process 
     * 1. Validates existence and prevents Admin self-deletion/deletion.
     * 2. Checks vital tables (appointments, payments, qa) for linked historical data.
     * 3. If "clean," performs a transaction-based wipe of profiles, offices, specialties, 
     * slots, notifications, and AI chat logs.
     * 4. Physically removes profile images from storage.
     * 5. Logs the permanent destruction of the account in system_audit_logs.
     *
     * @param  int  $id The Unique User ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteUser($id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        if ($user->roleid == 1) {
            return response()->json(['success' => false, 'message' => 'Security Error: Admin accounts cannot be deleted.'], 403);
        }

        $hasAppointments = DB::table('appointments')
            ->where('lawyerid', $id)
            ->orWhere('customerid', $id)
            ->exists();

        $hasInvoices = DB::table('payments_invoices')->where('userid', $id)->exists();

        $hasAnswers = DB::table('qa_answers')->where('lawyerid', $id)->exists();
        $hasQuestions = DB::table('qa_questions')->where('customerid', $id)->exists();

        $hasReviews = DB::table('reviews')
            ->join('appointments', 'reviews.appointid', '=', 'appointments.appointid')
            ->where('appointments.lawyerid', $id)
            ->exists();

        $hasSubscriptions = DB::table('lawyer_subscriptions')->where('lawyerid', $id)->exists();

        if ($hasAppointments || $hasInvoices || $hasAnswers || $hasQuestions || $hasReviews || $hasSubscriptions) {
            return response()->json([
                'success' => false,
                'message' => 'This user has critical historical data (appointments, financial records, or community activity). To maintain system integrity, permanent deletion is prohibited. Please use the LOCK function instead.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $lawyerProfile = DB::table('lawyer_profiles')->where('lawyerid', $id)->first();
            $customerProfile = DB::table('customer_profiles')->where('customerid', $id)->first();

            DB::table('ai_chat_history')->where('userid', $id)->delete();
            DB::table('notifications')->where('userid', $id)->delete();
            DB::table('availability_slots')->where('lawyerid', $id)->delete();
            DB::table('lawyer_profiles')->where('lawyerid', $id)->delete();
            DB::table('customer_profiles')->where('customerid', $id)->delete();
            DB::table('lawyer_offices')->where('lawyerid', $id)->delete();
            DB::table('lawyer_achievements')->where('lawyerid', $id)->delete();
            DB::table('lawyer_verifications')->where('lawyerid', $id)->delete();
            DB::table('lawyer_specialties')->where('lawyerid', $id)->delete();

            $userEmail = $user->email;
            $user->delete();

            if ($lawyerProfile && $lawyerProfile->profileimage) {
                Storage::disk('public')->delete($lawyerProfile->profileimage);
            }
            if ($customerProfile && $customerProfile->profileimage) {
                Storage::disk('public')->delete($customerProfile->profileimage);
            }

            $this->logAction("Permanently Deleted User ID: {$id} ({$userEmail}) and cleared associated disposable records.");

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'User account, profile, and disposable data (AI chats, notifications) have been permanently deleted.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Deletion Error for User ID {$id}: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'System error during deletion. Please check server logs.'
            ], 500);
        }
    }

    /**
     * Retrieves all pending or updating lawyer verification requests.
     *
     * Processes document images stored in JSON or string format into full
     * accessible URLs for the frontend.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPendingVerifications()
    {
        $verifications = LawyerVerification::with(['lawyer', 'lawyer.user'])
            ->whereIn('status', ['Pending', 'Updating'])
            ->orderBy('updated_at', 'desc')
            ->get();

        $verifications->transform(function ($item) {
            $docs = $item->documentimage;
            $fullUrls = [];

            $createUrl = function ($path) {
                $cleanPath = ltrim($path, '/');
                return asset('storage/' . $cleanPath);
            };

            if (is_array($docs) && count($docs) > 0) {
                foreach ($docs as $path) {
                    if (!empty($path)) {
                        $fullUrls[] = $createUrl($path);
                    }
                }
            } elseif (is_string($docs) && !empty($docs)) {
                $decoded = json_decode($docs, true);

                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    foreach ($decoded as $path) {
                        if (!empty($path)) {
                            $fullUrls[] = $createUrl($path);
                        }
                    }
                } else {
                    $fullUrls[] = $createUrl($docs);
                }
            }

            Log::debug('Docs for ID ' . $item->verifyid, ['urls' => $fullUrls]);

            $item->document_urls = $fullUrls;
            return $item;
        });

        return response()->json(['success' => true, 'data' => $verifications]);
    }

    /**
     * Approves a lawyer verification request.
     *
     * Updates the verification status, marks the lawyer's profile as verified,
     * and activates the lawyer's user account.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function approveVerification($id)
    {
        $verification = LawyerVerification::with(['lawyer', 'lawyer.user'])->findOrFail($id);

        $verification->update(['status' => 'Approved']);

        if ($verification->lawyer) {
            $verification->lawyer->update(['isverified' => true]);

            if ($verification->lawyer->user) {
                $verification->lawyer->user->update(['isactive' => true]);
            }
        }

        return response()->json(['success' => true, 'message' => 'Lawyer verified and account activated successfully.']);
    }

    /**
     * Rejects a lawyer verification request.
     *
     * Updates the verification status to 'Rejected' and ensures the lawyer's
     * profile remains unverified.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function rejectVerification($id)
    {
        $verification = LawyerVerification::findOrFail($id);

        $verification->update(['status' => 'Rejected']);

        LawyerProfile::where('lawyerid', $verification->lawyerid)->update(['isverified' => false]);

        return response()->json(['success' => true, 'message' => 'Verification rejected.']);
    }
}
