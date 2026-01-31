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
use Illuminate\Support\Facades\Mail;
use App\Mail\AutomatedNotificationMail;
use Illuminate\Support\Facades\Log;

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

        $expiredPending = Appointment::with(['userCustomer', 'slot'])
            ->join('availability_slots', 'appointments.slotid', '=', 'availability_slots.slotid')
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

                if ($app->userCustomer) {
                    $this->sendAppointmentEmail($app->userCustomer, 'declined_expired', $app);
                }
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

            $minPrice = $lawyerSpecSetting ? $lawyerSpecSetting->specminprice : 100;
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

            $appointment->load(['slot', 'userLawyer', 'userCustomer', 'invoice']);

            if ($appointment->userCustomer) {
                $this->sendAppointmentEmail($appointment->userCustomer, 'new_request_customer', $appointment);
            }

            if ($appointment->userLawyer) {
                $this->sendAppointmentEmail($appointment->userLawyer, 'new_request_lawyer', $appointment);
            }
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
            $appointment = Appointment::with(['userCustomer', 'slot'])
                ->where('appointid', $id)
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

                if ($appointment->userCustomer) {
                    $this->sendAppointmentEmail($appointment->userCustomer, 'confirmed', $appointment);
                }
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

                if ($appointment->userCustomer) {
                    $this->sendAppointmentEmail($appointment->userCustomer, 'declined_expired', $appointment);
                }
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

        $appointment = Appointment::with(['slot', 'userCustomer', 'userLawyer', 'invoice'])
            ->where('appointid', $id)
            ->where('customerid', $user->userid)
            ->first();

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

            if ($appointment->userLawyer) {
                $this->sendAppointmentEmail($appointment->userLawyer, 'cancelled_by_customer', $appointment);
            }

            if ($appointment->userCustomer) {
                $this->sendAppointmentEmail($appointment->userCustomer, 'customer_cancelled_confirm', $appointment);
            }

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

        $appointment = Appointment::with(['slot', 'invoice', 'lawyer', 'userCustomer'])
            ->where('appointid', $id)
            ->first();

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

            if ($appointment->userCustomer) {
                $this->sendAppointmentEmail($appointment->userCustomer, 'completed', $appointment);
            }
            
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

    /**
     * Send automated appointment-related notification emails to customers or lawyers.
     *
     * This method handles all email notifications triggered by appointment lifecycle
     * events such as new booking requests, confirmations, cancellations, expirations,
     * and completed sessions. Email content is dynamically generated based on the
     * notification type and appointment details.
     *
     * @param \App\Models\User        $recipientUser  The user who will receive the email (customer or lawyer)
     * @param string                 $type           The appointment notification type
     *                                               (new_request_customer, new_request_lawyer,
     *                                                confirmed, declined_expired,
     *                                                cancelled_by_customer, completed)
     * @param \App\Models\Appointment $appointment   The appointment entity containing booking details
     *
     * @return void
     */
    private function sendAppointmentEmail($recipientUser, $type, $appointment)
    {
        $mailData = [];
        $appId = $appointment->appointid;
        $time = $appointment->starttime;
        $date = $appointment->slot && $appointment->slot->availabledate
            ? Carbon::parse($appointment->slot->availabledate)->format('d/m/Y')
            : 'N/A';

        switch ($type) {
            case 'new_request_customer':
                $amount = $appointment->invoice ? number_format($appointment->invoice->amount) . '$' : 'N/A';
                $paymentMethod = $appointment->invoice->paymentmethod ?? 'N/A';
                $transactionId = $appointment->invoice->transactionno ?? 'N/A';

                $mailData = [
                    'subject' => "Booking Confirmation - Appointment #$appId",
                    'title'   => 'Appointment Request Received',
                    'content' => "Hello, your booking request for '$appointment->packagename' has been sent successfully.\n\n" .
                        "**Payment Information:**\n" .
                        "- Total Paid: $amount\n" .
                        "- Payment Method: $paymentMethod\n" .
                        "- Transaction ID: $transactionId\n\n" .
                        "**Appointment Details:**\n" .
                        "- Date: $date\n" .
                        "- Time: $time\n" .
                        "- ID: #$appId\n\n" .
                        "Please wait while the lawyer reviews and confirms your request."
                ];
                break;

            case 'new_request_lawyer':
                $amount = $appointment->invoice ? number_format($appointment->invoice->amount) . ' $' : 'N/A';
                $mailData = [
                    'subject' => "New Appointment Request #$appId",
                    'title'   => 'New Booking Alert',
                    'content' => "Dear Lawyer, you have received a new appointment request from a client.\n\n" .
                        "**Status: PAYMENT CONFIRMED**\n" .
                        "- Service: $appointment->packagename\n" .
                        "- Date: $date\n" .
                        "- Time: $time\n" .
                        "- Total Fee: $amount\n\n" .
                        "Please log in to your dashboard to approve or decline the request as soon as possible."
                ];
                break;

            case 'confirmed':
                $mailData = [
                    'subject' => "Appointment Confirmed - #$appId",
                    'title'   => 'Your Appointment is Ready!',
                    'content' => "Great news! Your appointment on $date at $time has been confirmed by the lawyer. Please be ready at the scheduled time."
                ];
                break;
            case 'declined_expired':
                $amount = $appointment->invoice ? number_format($appointment->invoice->amount) . ' $' : 'N/A';
                $mailData = [
                    'subject' => "Update on Appointment #$appId",
                    'title'   => 'Appointment Cancelled',
                    'content' => "Hello, we regret to inform you that your appointment #$appId could not be completed because it was declined by the lawyer or has expired.\n\n" .
                        "**Refund Information:**\n" .
                        "- Status: Refund Initiated\n" .
                        "- Amount: $amount (100% Refunded)"
                ];
                break;

            case 'customer_cancelled_confirm':
                $totalAmount = $appointment->invoice ? $appointment->invoice->amount : 0;
                $refundAmount = number_format($totalAmount / 1.1) . ' $';

                $mailData = [
                    'subject' => "Cancellation Confirmed - Appointment #$appId",
                    'title'   => 'Appointment Cancelled by You',
                    'content' => "Hello, this email confirms that you have cancelled your appointment #$appId.\n\n" .
                        "As per our policy, a 10% service fee has been applied.\n\n" .
                        "**Refund Information:**\n" .
                        "- Refund Amount: $refundAmount (90% of total paid)\n" .
                        "- Status: Processing"
                ];
                break;
            case 'cancelled_by_customer':
                $mailData = [
                    'subject' => "Appointment #$appId Cancelled by Client",
                    'title'   => 'Client Cancellation',
                    'content' => "Dear Lawyer, the appointment #$appId scheduled for $date has been cancelled by the client. The slot is now available again."
                ];
                break;
            case 'completed':
                $mailData = [
                    'subject' => "Session Completed - #$appId",
                    'title'   => 'Thank You for Using LegalEase',
                    'content' => "Your consultation session #$appId is officially complete. We hope you received valuable legal advice. Please take a moment to rate and review your lawyer's service."
                ];
                break;
        }

        if (!empty($mailData)) {
            try {
                Mail::to($recipientUser->email)->queue(new AutomatedNotificationMail($mailData));
            } catch (\Exception $e) {
                Log::error("Failed to send appointment email ($type) to {$recipientUser->email}: " . $e->getMessage());
            }
        }
    }
}
