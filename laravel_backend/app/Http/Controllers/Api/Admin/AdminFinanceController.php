<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Appointment;
use App\Models\LawyerVerification;
use App\Models\PaymentInvoice;
use App\Traits\HasAuditLog;

/**
 * Admin Finance Controller
 * 
 * Handles all financial operations and revenue management for the admin panel.
 * Provides endpoints for dashboard statistics, revenue tracking, and refund processing.
 */
class AdminFinanceController extends Controller
{
    use HasAuditLog;

    /**
     * Get dashboard statistics
     * 
     * Retrieves comprehensive statistics for the admin dashboard including:
     * - Total number of customers and lawyers
     * - Active lawyers count
     * - Total and pending appointments
     * - Pending verification requests
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing dashboard statistics
     */
    public function getDashboardStats()
    {
        $totalCustomers = User::where('roleid', 3)->count();
        $totalLawyers   = User::where('roleid', 2)->count();
        $activeLawyers  = User::where('roleid', 2)->where('isactive', true)->count();
        $totalAppointments = Appointment::count();
        $pendingAppointments = Appointment::where('status', 'Pending')->count();
        $pendingVerifications = LawyerVerification::whereIn('status', ['Pending', 'Updating'])->count();
        $pendingRefunds = PaymentInvoice::where('status', 'Refund_Pending')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'users' => [
                    'total_customers' => $totalCustomers,
                    'total_lawyers'   => $totalLawyers,
                    'active_lawyers'  => $activeLawyers
                ],
                'appointments' => [
                    'total'   => $totalAppointments,
                    'pending' => $pendingAppointments
                ],
                'pending_verifications' => $pendingVerifications,
                'pending_refunds' => $pendingRefunds
            ]
        ]);
    }

    /**
     * Get revenue statistics
     * 
     * Calculates and returns detailed revenue statistics based on the specified time period.
     * Includes subscription revenue, booking revenue (gross and net), service fees, commissions,
     * and total net revenue. Also returns recent transactions for the period.
     * 
     * Revenue breakdown:
     * - Subscription: Full amount from lawyer subscriptions
     * - Booking Gross: Total amount paid by customers for appointments
     * - Booking Net: Platform's net revenue from bookings (service fee + commission)
     * - Service Fee: 10% of base booking price
     * - Commission: 20% of base booking price
     * 
     * @param \Illuminate\Http\Request $request Request object containing optional 'period' parameter
     *                                          Valid values: 'day', 'month', 'year', 'all' (default)
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing revenue statistics and recent transactions
     */
    public function getRevenueStats(Request $request)
    {
        try {
            $period = $request->input('period', 'all');
            $now = now();

            $query = DB::table('payments_invoices')
                ->whereIn('status', ['Success', 'Refunded']);

            if ($period == 'day') {
                $query->whereDate('createdat', $now->toDateString());
            } elseif ($period == 'month') {
                $query->whereMonth('createdat', $now->month)->whereYear('createdat', $now->year);
            } elseif ($period == 'year') {
                $query->whereYear('createdat', $now->year);
            }

            $allInvoices = (clone $query)
                ->leftJoin('users', 'payments_invoices.userid', '=', 'users.userid')
                ->select('payments_invoices.*', 'users.roleid')
                ->get();

            $subRevenue = 0;
            $bookingGross = 0;
            $bookingNet = 0;
            $serviceFeeTotal = 0;
            $commissionTotal = 0;
            $totalNetRevenue = 0;

            foreach ($allInvoices as $inv) {

                if ($inv->roleid == 2 && $inv->status === 'Success') {
                    $subRevenue += $inv->amount;
                    $totalNetRevenue += $inv->amount;
                } else if ($inv->roleid == 3) {
                    if ($inv->status === 'Success') {
                        $bookingGross += $inv->amount;

                        $basePrice = $inv->amount / 1.1;
                        $service = $basePrice * 0.1;
                        $commission = $basePrice * 0.2;
                        $net = $service + $commission;

                        $serviceFeeTotal += $service;
                        $commissionTotal += $commission;
                        $bookingNet += $net;
                        $totalNetRevenue += $net;
                    } else if ($inv->status === 'Refunded') {

                        $keptFee = $inv->amount - ($inv->refundamount ?? 0);

                        $serviceFeeTotal += $keptFee;
                        $bookingNet += $keptFee;
                        $totalNetRevenue += $keptFee;
                    }
                }
            }

            $transactions = (clone $query)
                ->leftJoin('users', 'payments_invoices.userid', '=', 'users.userid')
                ->select('payments_invoices.*', 'users.email', 'users.roleid')
                ->orderBy('payments_invoices.createdat', 'desc')
                ->paginate(5)
                
               ->through(function ($item) {

                    $item->payment_type = ($item->roleid == 2) ? 'Subscription' : 'Booking';

                    if ($item->status === 'Refunded') {
                        $item->net_amount = $item->amount - ($item->refundamount ?? 0);
                    } else {
                        $item->net_amount = ($item->roleid == 2)
                            ? $item->amount
                            : ($item->amount / 1.1) * 0.3;
                    }
                    return $item;
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'revenue_sources' => [
                        'subscription' => round($subRevenue, 2),
                        'booking_gross' => round($bookingGross, 2),
                        'booking_net' => round($bookingNet, 2),
                        'service_fee_total' => round($serviceFeeTotal, 2),
                        'commission_total' => round($commissionTotal, 2),
                    ],
                    'total_revenue' => round($totalNetRevenue, 2),
                    'recent_transactions' => $transactions
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get refund requests
     * 
     * Retrieves all pending refund requests with associated user and appointment information.
     * Calculates suggested refund amount and platform kept fee for each request.
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing list of pending refund requests
     */
    public function getRefundRequests()
    {
        $refunds = PaymentInvoice::where('status', 'Refund_Pending')
            ->with([
                'user:userid,email',
                'appointment' => function ($q) {
                    $q->select('appointid', 'lawyerid', 'slotid', 'starttime', 'packagename', 'status')
                        ->with('slot:slotid,availabledate');
                }
            ])
            ->orderBy('createdat', 'desc')
            ->get();

        $refunds->transform(function ($invoice) {
            $invoice->total_customer_paid = $invoice->amount;

            $invoice->suggested_refund = $invoice->refundamount > 0
                ? $invoice->refundamount
                : round($invoice->amount / 1.1, 2);

            $invoice->platform_kept_fee = round($invoice->amount - $invoice->suggested_refund, 2);

            return $invoice;
        });

        return response()->json(['success' => true, 'data' => $refunds]);
    }

    /**
     * Process refund
     * 
     * Processes a refund request for a specific invoice. Updates the invoice status to 'Refunded'
     * and cancels the associated appointment if one exists. Logs the refund action for audit purposes.
     * 
     * @param int $invoiceId The ID of the payment invoice to process refund for
     * 
     * @return \Illuminate\Http\JsonResponse JSON response indicating success or failure of the refund operation
     */
    public function processRefund($invoiceId)
    {
        DB::beginTransaction();
        try {
            $invoice = PaymentInvoice::findOrFail($invoiceId);

            if (!in_array($invoice->status, ['Refund_Pending', 'Success'])) {
                return response()->json(['message' => 'Invoice status invalid for refund.'], 400);
            }

            $invoice->status = 'Refunded';
            $invoice->save();

            if ($invoice->appointid) {
                $appointment = Appointment::find($invoice->appointid);
                if ($appointment) {
                    $appointment->status = 'Cancelled';
                    $appointment->save();
                }
            }

            $actualRefund = $invoice->refundamount > 0 ? $invoice->refundamount : $invoice->amount;

            $this->logAction("Processed refund for Invoice ID: {$invoiceId}, Actual Refund Paid: {$actualRefund}");

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Refund completed successfully.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
