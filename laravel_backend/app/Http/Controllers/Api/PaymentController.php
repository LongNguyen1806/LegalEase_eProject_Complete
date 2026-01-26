<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\SubscriptionPlan;
use App\Models\LawyerSubscription;
use App\Models\PaymentInvoice;
use App\Models\Appointment;
use App\Models\LawyerProfile;
use App\Traits\HasNotifications;

/**
 * Class PaymentController
 * * Manages the platform's financial transactions, including lawyer subscription upgrades
 * and customer booking payments. It handles fee calculations, invoice generation,
 * and automated notifications for financial events.
 * * @package App\Http\Controllers\Api
 */
class PaymentController extends Controller
{
    use HasNotifications;

    /** @var float Internal commission rate taken by the platform (20%) */
    const PLATFORM_COMMISSION_RATE = 0.20;

    /** @var float Percentage of the base price earned by the lawyer (80%) */
    const LAWYER_SHARE_RATE = 0.80;

    /** @var float Markup multiplier for the customer service fee (10%) */
    const SERVICE_FEE_MARKUP = 1.1;

    /**
     * Retrieve all available subscription plans for lawyers.
     * * @return \Illuminate\Http\JsonResponse
     */
    public function getPlans()
    {
        return response()->json(['success' => true, 'data' => SubscriptionPlan::all()]);
    }

    /**
     * Process a subscription plan purchase for a lawyer.
     * * Upgrades the lawyer's profile to 'Pro' status and creates a new 
     * subscription record. Automatically determines duration based on plan name.
     * * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function buySubscription(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Only lawyers can buy subscriptions.'], 403);

        $validator = Validator::make($request->all(), [
            'planid' => 'required|exists:subscription_plans,planid',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $plan = SubscriptionPlan::find($request->planid);

        DB::beginTransaction();
        try {
            $invoice = PaymentInvoice::create([
                'userid'         => $user->userid,
                'appointid'      => null,
                'subid'          => null,
                'transactionno'  => 'TXN_SUB_' . time() . rand(1000, 9999),
                'paymentmethod'  => 'Paypal',
                'amount'         => $plan->price,
                'refundamount'   => 0,
                'status'         => 'Success',
                'createdat'      => now(),
            ]);

            $startDate = now();
            $endDate = (stripos($plan->planname, 'Year') !== false)
                ? $startDate->copy()->addYear()
                : $startDate->copy()->addMonth();

            $subscription = LawyerSubscription::create([
                'lawyerid'  => $user->userid,
                'planid'    => $plan->planid,
                'startdate' => $startDate,
                'enddate'   => $endDate,
                'status'    => 'Active',
            ]);

            $invoice->update(['subid' => $subscription->subid]);
            LawyerProfile::where('lawyerid', $user->userid)->update(['ispro' => true]);

            DB::commit();

            $this->sendNotification(
                $user->userid,
                "Congratulations! Your upgrade to the Pro plan ({$plan->planname}) was successful. Enjoy your premium benefits!",
                "/lawyer/dashboard"
            );

            return response()->json([
                'success' => true,
                'message' => 'Upgrade to Pro plan successful!',
                'data' => $subscription
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Retrieve the active subscription details for the authenticated lawyer.
     * * @return \Illuminate\Http\JsonResponse
     */
    public function getCurrentSubscription()
    {
        $user = Auth::user();

        if ($user->roleid != 2) {
            return response()->json(['success' => true, 'data' => null]);
        }

        $sub = LawyerSubscription::where('lawyerid', $user->userid)
            ->where('status', 'Active')
            ->whereDate('enddate', '>', now())
            ->join('subscription_plans', 'lawyer_subscriptions.planid', '=', 'subscription_plans.planid')
            ->select(
                'lawyer_subscriptions.*',
                'subscription_plans.planname',
                'subscription_plans.price'
            )
            ->orderBy('enddate', 'desc')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $sub
        ]);
    }

    /**
     * Calculate booking fee breakdown based on lawyer's specialty rates.
     * * Includes the base amount (earned by lawyer/platform) and the 10% service fee markup.
     * * @param  int  $lawyerId
     * @param  int  $duration (in minutes)
     * @return array Breakdown of base_amount, service_fee, and total_amount.
     */
    private function calculateBookingFee($lawyerId, $duration)
    {
        $firstSpec = DB::table('lawyer_specialties')->where('lawyerid', $lawyerId)->first();
        $specId = $firstSpec ? $firstSpec->specid : 1;

        $lawyerSpec = DB::table('lawyer_specialties')
            ->where('lawyerid', $lawyerId)
            ->where('specid', $specId)
            ->first();
        $hourlyRate = $lawyerSpec ? $lawyerSpec->specminprice : 300;
        $basePrice = ($duration / 60) * $hourlyRate;
        $totalPrice = $basePrice * self::SERVICE_FEE_MARKUP;

        return [
            'base_amount'    => round($basePrice),
            'service_fee'    => round($totalPrice - $basePrice),
            'total_amount'   => round($totalPrice)
        ];
    }

    /**
     * Get a price breakdown for a potential booking before the customer pays.
     * * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPaymentInfo(Request $request)
    {
        $request->validate([
            'lawyerid' => 'required|exists:users,userid',
            'duration' => 'required|integer|in:60,120',
        ]);

        $feeDetails = $this->calculateBookingFee($request->lawyerid, $request->duration);

        return response()->json([
            'success' => true,
            'data' => [
                'lawyerid'     => $request->lawyerid,
                'duration'     => $request->duration,
                'base_amount'  => $feeDetails['base_amount'],
                'service_fee'  => $feeDetails['service_fee'],
                'total_amount' => $feeDetails['total_amount'],
                'currency'     => 'usd',
                'policy_note'  => 'The 10% service fee is non-refundable upon cancellation.'
            ]
        ]);
    }

    /**
     * Confirm and process payment for a specific appointment booking.
     * * Updates the invoice status and notifies both the customer and the lawyer.
     * * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function payBooking(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['message' => 'Unauthorized'], 403);

        $request->validate(['appointid' => 'required|exists:appointments,appointid']);

        $appointment = Appointment::find($request->appointid);
        $invoice = PaymentInvoice::where('appointid', $appointment->appointid)->first();

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found for this appointment.'], 404);
        }

        if ($invoice->status === 'Success') {
            return response()->json(['message' => 'This appointment has already been paid.'], 400);
        }

        DB::beginTransaction();
        try {
            $invoice->update([
                'transactionno' => 'TXN_BK_' . time() . rand(1000, 9999),
                'paymentmethod' => 'Paypal',
                'status'         => 'Success',
                'refundamount'  => 0,
                'createdat'      => now(),
            ]);

            DB::commit();

            $this->sendNotification(
                $user->userid,
                "Payment for appointment #{$appointment->appointid} was successful. Please wait for the lawyer to confirm.",
                "/customer/my-appointments/{$appointment->appointid}"
            );

            $this->sendNotification(
                $appointment->lawyerid,
                "Customer has successfully paid for appointment #{$appointment->appointid}. Please review and confirm the schedule.",
                "/lawyer/appointments"
            );

            return response()->json([
                'success' => true,
                'message' => 'Payment successful. Waiting for lawyer confirmation.',
                'data' => [
                    'invoiceid' => $invoice->invid,
                    'totalpaid' => $invoice->amount,
                    'refundable_base_amount' => round($invoice->amount / self::SERVICE_FEE_MARKUP, 2),
                    'appointment_status' => $appointment->status
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Retrieve the transaction history (invoices) for the authenticated user.
     * * Includes dynamic calculations of fee breakdowns for display purposes.
     * * @return \Illuminate\Http\JsonResponse
     */
    public function getHistory()
    {
        $user = Auth::user();

        $invoices = PaymentInvoice::with(['appointment.lawyer', 'subscription.plan'])
            ->where('userid', $user->userid)
            ->orderBy('createdat', 'desc')
            ->get();

        $invoices->transform(function ($invoice) {
            if ($invoice->appointid) {
                $invoice->base_amount_display = round($invoice->amount / self::SERVICE_FEE_MARKUP, 2);
                $invoice->service_fee_display = round($invoice->amount - $invoice->base_amount_display, 2);
            }
            return $invoice;
        });

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }
}
