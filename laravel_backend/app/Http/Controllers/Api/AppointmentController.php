<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Appointment;
use App\Models\AvailabilitySlot;
use App\Models\PaymentInvoice;
use App\Models\LawyerEarning;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Traits\HasNotifications;
use Carbon\Carbon;

/**
 * AppointmentController
 *
 * Handles all appointment-related API operations including:
 * - Creating, retrieving, and managing appointments
 * - Appointment confirmation, rejection, and cancellation
 * - Automatic expiration of pending appointments
 * - Payment processing and earning calculations
 */
class AppointmentController extends Controller
{
    use HasNotifications;


    /**
     * Automatically cancel expired pending appointments
     *
     * Marks pending appointments as expired and processes refunds if applicable.
     * Sets status to 'Refund_Pending' for paid appointments or deletes unpaid ones.
     *
     * @param int $userId The user ID
     * @param int $roleId The role ID
     * @return void
     */
    private function autoCancelExpired(int $userId, int $roleId)
    {
        $now = now();

        $expiredPending = Appointment::join('availability_slots', 'appointments.slotid', '=', 'availability_slots.slotid')
            ->where('appointments.status', 'Pending')
            ->whereRaw("CONCAT(availability_slots.availabledate, ' ', appointments.starttime) < ?", [$now])
            ->select('appointments.*')
            ->get();

        foreach ($expiredPending as $app) {
            $invoice = PaymentInvoice::where('appointid', $app->appointid)
                ->where('status', 'Success')
                ->first();

            if ($invoice) {
                $app->update(['status' => 'Refund_Pending']);
                $invoice->update([
                    'status' => 'Refund_Pending',
                    'refundamount' => $invoice->amount
                ]);

                $this->sendNotification(
                    $app->customerid,
                    "Appointment #{$app->appointid} has expired (Not confirmed). Refund pending.",
                    "/customer/my-appointments/{$app->appointid}"
                );
            } else {
                $app->delete();
            }
        }
    }

    /**
     * Retrieve all appointments for the authenticated user
     *
     * Returns paginated appointments list. Lawyers see their appointments,
     * Customers see their appointments.
     *
     * @param Request $request The HTTP request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $this->autoCancelExpired($user->userid, $user->roleid);

        $query = Appointment::query()->with(['slot']);

        if ($user->roleid == 2) {
            $query->where('lawyerid', $user->userid)->with('customer');
        } elseif ($user->roleid == 3) {
            $query->where('customerid', $user->userid)->with('lawyer');
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->paginate(10)
        ]);
    }

    /**
     * Create a new appointment (Customer only)
     *
     * Books an appointment with a lawyer, validates slot availability,
     * creates payment invoice, and sends notifications.
     *
     * @param Request $request Contains: slotid, packagename, starttime, duration, note, payment_method
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['message' => 'Unauthorized'], 403);
        $request->validate([
            'slotid'         => 'required|exists:availability_slots,slotid',
            'packagename'    => 'required|string|max:100',
            'starttime'      => 'required|date_format:H:i:s',
            'duration'       => 'required|integer|in:60,120',
            'note'           => 'required|string|min:10',
            'payment_method' => 'required|string',
        ]);

        $this->autoCancelExpired($user->userid, $user->roleid);

        DB::beginTransaction();
        try {
            $shift = AvailabilitySlot::where('slotid', $request->slotid)->lockForUpdate()->first();

            if (!$shift) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Time slot not found.'], 404);
            }

            $lawyerUser = User::find($shift->lawyerid);
            if (!$lawyerUser || !$lawyerUser->isactive) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'This lawyer is currently inactive.'], 403);
            }


            $cleanDate = Carbon::parse($shift->availabledate)->toDateString();
            $appointmentDateTime = Carbon::parse($cleanDate . ' ' . $request->starttime);

            if ($appointmentDateTime->isPast()) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'This time slot has already expired. Please go back and select a future time.'
                ], 400);
            }

            $requestStart = Carbon::parse($request->starttime);
            $requestEnd   = $requestStart->copy()->addMinutes($request->duration);

            $conflict = Appointment::where('slotid', $request->slotid)
                ->whereIn('status', ['Pending', 'Confirmed'])
                ->where(function ($q) use ($requestStart, $requestEnd) {
                    $q->where('starttime', '<', $requestEnd->format('H:i:s'))
                        ->whereRaw("ADDTIME(starttime, SEC_TO_TIME(duration * 60 )) > ?", [$requestStart->format('H:i:s')]);
                })->exists();

            if ($conflict) {
                DB::rollBack();
                return response()->json(['message' => 'This time slot is already booked.'], 409);
            }


            $appointment = Appointment::create([
                'customerid'  => $user->userid,
                'lawyerid'    => $shift->lawyerid,
                'slotid'      => $shift->slotid,
                'packagename' => $request->packagename,
                'duration'    => $request->duration,
                'starttime'   => $request->starttime,
                'note'        => $request->note,
                'status'      => 'Pending',
            ]);


            $firstSpec = DB::table('lawyer_specialties')->where('lawyerid', $shift->lawyerid)->first();
            $specId = $firstSpec ? $firstSpec->specid : 1;
            $lawyerSpecSetting = DB::table('lawyer_specialties')
                ->where('lawyerid', $shift->lawyerid)
                ->where('specid', $specId)
                ->first();

            $minPrice = $lawyerSpecSetting ? $lawyerSpecSetting->specminprice : 300;
            $totalAmount = ($request->duration / 60) * $minPrice * 1.1;

            PaymentInvoice::create([
                'userid'        => $user->userid,
                'appointid'     => $appointment->appointid,
                'amount'        => $totalAmount,
                'refundamount'  => 0,
                'status'        => 'Success',
                'transactionno' => 'PAY_' . strtoupper(bin2hex(random_bytes(4))),
                'paymentmethod' => $request->payment_method,
                'createdat'     => now(),
            ]);

            DB::commit();


            $this->sendNotification(
                $shift->lawyerid,
                "You have a new appointment request #{$appointment->appointid}.",
                "/lawyer/appointments"
            );

            return response()->json([
                'success' => true,
                'data' => $appointment,
                'total_amount' => $totalAmount
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Internal Server Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update appointment status (Lawyer only)
     *
     * Allows lawyer to approve or reject a pending appointment.
     * Handles refund processing if payment exists.
     *
     * @param Request $request Contains: action (approve/reject)
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);
        $this->autoCancelExpired($user->userid, $user->roleid);
        DB::beginTransaction();
        try {
            $appointment = Appointment::where('appointid', $id)
                ->lockForUpdate()
                ->first();

            if (!$appointment || $appointment->lawyerid != $user->userid) {
                DB::rollBack();
                return response()->json(['message' => 'Unauthorized access.'], 403);
            }

            if ($appointment->status !== 'Pending') {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => "This appointment is already {$appointment->status}. Your action cannot be completed.",
                    'current_status' => $appointment->status
                ], 409);
            }

            if ($request->action === 'approve') {
                $appointment->status = 'Confirmed';
                $appointment->save();

                $this->sendNotification(
                    $appointment->customerid,
                    "Lawyer confirmed your appointment #{$appointment->appointid}.",
                    "/customer/my-appointments/{$appointment->appointid}"
                );

                DB::commit();
                return response()->json(['success' => true, 'message' => 'Appointment confirmed successfully.']);
            } else {
                $rejectMessage = " | [Lawyer]: Sorry, I cannot accept this appointment at the moment.";
                $appointment->note = $appointment->note . $rejectMessage;

                $invoice = PaymentInvoice::where('appointid', $appointment->appointid)
                    ->where('status', 'Success')
                    ->first();

                if ($invoice) {
                    $appointment->status = 'Refund_Pending';
                    $invoice->update([
                        'status' => 'Refund_Pending',
                        'refundamount' => $invoice->amount
                    ]);
                    $msg = 'Appointment declined. Refund is being processed.';

                    $this->sendNotification(
                        $appointment->customerid,
                        "Lawyer declined appointment #{$appointment->appointid}. Refund is being processed.",
                        "/customer/my-appointments/{$appointment->appointid}"
                    );
                } else {
                    $appointment->status = 'Cancelled';
                    PaymentInvoice::where('appointid', $appointment->appointid)->delete();
                    $msg = 'Appointment declined.';

                    $this->sendNotification(
                        $appointment->customerid,
                        "Lawyer was unable to accept your request #{$appointment->appointid}."
                    );
                }

                $appointment->save();
                DB::commit();
                return response()->json(['success' => true, 'message' => $msg]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Internal Server Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cancel appointment by customer
     *
     * Allows customer to cancel their appointment with a reason.
     * Must be cancelled at least 24 hours before the appointment.
     * Processes refund if payment exists.
     *
     * @param Request $request Contains: reason (required)
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancelByCustomer(Request $request, $id)
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);

        $request->validate(['reason' => 'required|string|min:10|max:500']);

        $appointment = Appointment::with('slot')->where('appointid', $id)->where('customerid', $user->userid)->first();
        if (!$appointment) return response()->json(['success' => false, 'message' => 'No appointment found.'], 404);

        if (!in_array($appointment->status, ['Pending', 'Confirmed'])) {
            return response()->json(['success' => false, 'message' => 'The appointment is not in a cancellable state.'], 400);
        }

        $dateStr = Carbon::parse($appointment->slot->availabledate)->toDateString();
        $timeStr = $appointment->starttime;

        $appointmentTime = Carbon::parse("$dateStr $timeStr", config('app.timezone'));
        $diffInMinutes = now()->diffInMinutes($appointmentTime, false);

        if ($diffInMinutes < 1440) {
            return response()->json([
                'success' => false,
                'message' => 'The cancellation deadline has passed (cancellations must be made at least 24 hours before the appointment)'
            ], 400);
        }
        DB::beginTransaction();
        try {
            $invoice = PaymentInvoice::where('appointid', $appointment->appointid)->first();
            $now = now();
            $appointment->note .= "\n--- [CLIENT CANCELED] (" . $now->format('d/m/Y H:i') . ") ---\nReason: " . $request->reason;

            if ($invoice && $invoice->status === 'Success') {
                $appointment->status = 'Refund_Pending';

                $refundAmount = $invoice->amount / 1.1;

                $invoice->update([
                    'status' => 'Refund_Pending',
                    'refundamount' => round($refundAmount, 2) 
                ]);

                $resMessage = 'The cancellation request has been processed successfully. The 10% service fee was applied. Refund is pending.';
            } else {
                $appointment->status = 'Cancelled';
                if ($invoice) $invoice->delete();
                $resMessage = 'The appointment has been successfully canceled.';
            }

            $appointment->save();
            DB::commit();

            $this->sendNotification($appointment->lawyerid, "Appointment #{$id} was canceled by the client.", "/lawyer/appointments");

            return response()->json(['success' => true, 'message' => $resMessage]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Mark appointment as completed (Lawyer only)
     *
     * Marks confirmed appointment as completed after consultation time ends.
     * Calculates and records lawyer earnings with platform commission deduction.
     *
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function completeAppointment($id)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $this->autoCancelExpired($user->userid, $user->roleid);

        $appointment = Appointment::with(['slot', 'invoice', 'lawyer'])->where('appointid', $id)->first();

        if (!$appointment || $appointment->lawyerid != $user->userid) {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        $startDateStr = Carbon::parse($appointment->slot->availabledate)->toDateString();
        $endTime = Carbon::parse($startDateStr . ' ' . $appointment->starttime)->addMinutes($appointment->duration);

        if ($appointment->status !== 'Confirmed') {
            return response()->json(['message' => 'Appointment not confirmed or paid.'], 400);
        }

        if (now()->lt($endTime)) {
            return response()->json(['message' => 'Consultation time has not ended yet.'], 400);
        }

        DB::beginTransaction();
        try {

            $totalAmount = $appointment->invoice ? $appointment->invoice->amount : 0;

            $basePrice = $totalAmount / 1.1;

            $platformCommission = $basePrice * 0.20;

            $lawyerNet = $basePrice * 0.80;

            $appointment->update([
                'status' => 'Completed',
                'commissionfee' => $platformCommission 
            ]);

            $earning = LawyerEarning::firstOrCreate(['lawyerid' => $appointment->lawyerid]);
            $earning->totalmatches += 1;

            $earning->totalcommissionpaid += $lawyerNet;
            $earning->save();

            DB::commit();

            $this->sendNotification(
                $appointment->customerid,
                "Appointment #{$appointment->appointid} completed. Please leave a review for Lawyer {$appointment->lawyer->fullname}.",
                "/lawyers/{$appointment->lawyerid}/review"
            );

            return response()->json(['success' => true, 'message' => 'Appointment completed.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Retrieve detailed appointment information
     *
     * Returns complete appointment details with related data including customer,
     * lawyer profile, office location, and fee breakdown.
     *
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $user = Auth::user();
        $this->autoCancelExpired($user->userid, $user->roleid);
        $appointment = Appointment::with([
            'customer',
            'lawyer.user',
            'lawyer.specializations',
            'lawyer.office.location',
            'slot',
            'invoice'
        ])->find($id);

        if (!$appointment) return response()->json(['message' => 'Appointment not found'], 404);

        if ($appointment->customer) {
            $appointment->customer->setRelation('customer_profile', $appointment->customer);
        }

        if ($appointment->lawyer) {
            $appointment->lawyer->setRelation('lawyer_profile', $appointment->lawyer);
        }

        $dateStr = Carbon::parse($appointment->slot->availabledate)->toDateString();
        $appointmentDateTime = Carbon::parse($dateStr . ' ' . $appointment->starttime, config('app.timezone'));

        $endTime = $appointmentDateTime->copy()->addMinutes($appointment->duration);
        $diffInMinutes = now()->diffInMinutes($appointmentDateTime, false);

        $appointment->can_cancel = in_array($appointment->status, ['Pending', 'Confirmed']) && ($diffInMinutes >= 1440);
        $total = $appointment->invoice ? $appointment->invoice->amount : 0;

        $consultationFee = $total / 1.1;

        $serviceFee = $total - $consultationFee;

        $appointment->display_fees = [
            'consultation_fee' => round($consultationFee),
            'service_fee'      => round($serviceFee),
            'total'            => $total,
            'refund_amount'    => $appointment->invoice ? $appointment->invoice->refundamount : 0
        ];

        $appointment->can_complete = ($appointment->status === 'Confirmed' && now()->gt($endTime));
        $appointment->is_refund_case = ($appointment->status === 'Refund_Pending');

        return response()->json(['success' => true, 'data' => $appointment]);
    }

    /**
     * Retrieve customer's specific appointment details (Customer only)
     *
     * Returns detailed appointment information for a specific appointment
     * belonging to the authenticated customer.
     *
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function myAppointments($id)
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['message' => 'Unauthorized'], 403);
        $this->autoCancelExpired($user->userid, $user->roleid);
        $appointment = Appointment::with([
            'lawyer.user',
            'lawyer.office.location',
            'slot',
            'invoice'
        ])
            ->where('appointid', $id)
            ->where('customerid', $user->userid)
            ->first();

        if (!$appointment) return response()->json(['success' => false, 'message' => 'Not found.'], 404);

        $dateStr = Carbon::parse($appointment->slot->availabledate)->toDateString();
        $timeStr = $appointment->starttime;

        $appointmentTime = Carbon::parse("$dateStr $timeStr", config('app.timezone'));
        $diffInMinutes = now()->diffInMinutes($appointmentTime, false);
        $appointment->can_cancel = in_array($appointment->status, ['Pending', 'Confirmed']) && ($diffInMinutes >= 1440);

        $total = $appointment->invoice ? $appointment->invoice->amount : 0;
        $consultationFee = $total / 1.1;
        $serviceFee = $total - $consultationFee;

        $appointment->display_fees = [
            'consultation_fee' => round($consultationFee),
            'service_fee'      => round($serviceFee),
            'total'            => $total,
            'refund_amount'    => $appointment->invoice ? $appointment->invoice->refundamount : 0
        ];

        $appointment->is_refund_case = ($appointment->status === 'Refund_Pending');

        return response()->json(['success' => true, 'data' => $appointment]);
    }

    /**
     * Retrieve all appointments for customer (Customer only)
     *
     * Returns paginated list of all appointments belonging to the
     * authenticated customer, ordered by most recent.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function myList()
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['message' => 'Unauthorized'], 403);

        $this->autoCancelExpired($user->userid, $user->roleid);

        $appointments = Appointment::with(['lawyer', 'slot', 'invoice'])
            ->where('customerid', $user->userid)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $appointments]);
    }

    /**
     * Retrieve appointment details for lawyer (Lawyer only)
     *
     * Returns detailed appointment information including customer email,
     * office address, and completion eligibility status.
     *
     * @param mixed $id The appointment ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLawyerAppointmentDetail($id)
    {
        $user = Auth::user();
        $this->autoCancelExpired($user->userid, $user->roleid);
        $appointment = Appointment::with([
            'customer.user:userid,email',
            'lawyer.office.location',
            'slot',
            'invoice'
        ])
            ->where('appointid', $id)
            ->where('lawyerid', $user->userid)
            ->first();

        if (!$appointment) {
            return response()->json(['success' => false, 'message' => 'Appointment not found.'], 404);
        }

        $office = $appointment->lawyer->office ?? null;
        $fullAddress = "Online Consultation";
        if ($office) {
            $street = $office->addressdetail;
            $city = $office->location->cityname ?? '';
            $fullAddress = $street . ($city ? ", " . $city : "");
        }
        $appointment->full_office_address = $fullAddress;


        $appointment->customer_email = $appointment->customer->user->email ?? 'N/A';
        $appointment->payment_method = $appointment->invoice->paymentmethod ?? 'Not provided';

        $dateStr = Carbon::parse($appointment->slot->availabledate)->toDateString();
        $appointmentDateTime = Carbon::parse($dateStr . ' ' . $appointment->starttime);
        $endTime = $appointmentDateTime->copy()->addMinutes($appointment->duration);

        $appointment->can_complete = ($appointment->status === 'Confirmed' && now()->gt($endTime));

        $total = $appointment->invoice ? $appointment->invoice->amount : 0;

        $consultationFee = $total / 1.1;
        $serviceFee = $total - $consultationFee;

        $appointment->display_fees = [
            'consultation_fee' => round($consultationFee),
            'service_fee'      => round($serviceFee),
            'total'            => $total,
            'refund_amount'    => $appointment->invoice ? $appointment->invoice->refundamount : 0
        ];

        $appointment->is_refund_case = ($appointment->status === 'Refund_Pending');

        return response()->json(['success' => true, 'data' => $appointment]);
    }
}
