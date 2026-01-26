<?php

namespace App\Http\Controllers\Api\Admin; 

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Appointment;
use App\Models\PaymentInvoice;
use App\Traits\HasAuditLog; 


class AdminAppointmentController extends Controller
{
    use HasAuditLog;

    /**
     * Retrieves a paginated list of appointments for the administrator.
     * Includes functionality for eager loading relationships, filtering by keyword,
     * status, and date.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = Appointment::with([
                'lawyer.user',
                'customer.user',
                'slot',
                'invoice'
            ]);

            if ($request->filled('keyword')) {
                $kw = $request->keyword;
                $query->where(function ($q) use ($kw) {
                    $q->where('appointid', $kw)
                        ->orWhereHas('lawyer', function ($sq) use ($kw) {
                            $sq->where('fullname', 'like', "%$kw%");
                        })
                        ->orWhereHas('customer', function ($sq) use ($kw) {
                            $sq->where('fullname', 'like', "%$kw%");
                        });
                });
            }

            if ($request->filled('status') && $request->status !== 'All') {
                $query->where('status', $request->status);
            }

            if ($request->filled('date')) {
                $query->whereHas('slot', function ($q) use ($request) {
                    $q->whereDate('availabledate', $request->date);
                });
            }

            $data = $query->orderBy('created_at', 'desc')->paginate(10);
            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            Log::error("Get Admin Appointments Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Forcefully cancels an appointment.
     * Handles logic for updating invoice statuses based on payment completion
     * (switching to Refund_Pending if paid, or Cancelled if not).
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancel($id)
    {
        DB::beginTransaction();
        try {
            $appointment = Appointment::findOrFail($id);

            if (in_array($appointment->status, ['Completed', 'Cancelled', 'Refunded'])) {
                return response()->json(['message' => '“The appointment cannot be canceled in this status.'], 400);
            }

            $oldStatus = $appointment->status;

            $invoice = PaymentInvoice::where('appointid', $appointment->appointid)->first();
            $msg = 'Đã hủy lịch hẹn.';

            if ($invoice && $invoice->status === 'Success') {
                $invoice->status = 'Refund_Pending';
                $invoice->save();

                $appointment->status = 'Refund_Pending';
                $appointment->save();

                $msg = '“The appointment has been canceled. Since the customer has already paid, the status has been changed to ‘Pending Refund’.';
            } else {
                if ($invoice) {
                    $invoice->status = 'Cancelled';
                    $invoice->save();
                }
                $appointment->status = 'Cancelled';
                $appointment->save();
            }

            $this->logAction("Admin Force Cancel Appointment #{$id} (Old: {$oldStatus})");

            DB::commit();
            return response()->json(['success' => true, 'message' => $msg]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Retrieves detailed information for a specific appointment.
     * Eager loads lawyer, customer, slot, and invoice details.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $appointment = Appointment::with([
            'lawyer.user',
            'customer.user',
            'slot',
            'invoice'
        ])->find($id);

        if (!$appointment) return response()->json(['message' => 'Not found'], 404);

        return response()->json(['success' => true, 'data' => $appointment]);
    }

    /**
     * Permanently deletes an appointment and its associated invoice data from the database.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $appointment = Appointment::findOrFail($id);
            
            PaymentInvoice::where('appointid', $id)->delete();

            $appointment->delete();

            $this->logAction("Admin Deleted Appointment #{$id}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'The appointment and all related data have been permanently deleted.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Delete error: ' . $e->getMessage()], 500);
        }
    }
}