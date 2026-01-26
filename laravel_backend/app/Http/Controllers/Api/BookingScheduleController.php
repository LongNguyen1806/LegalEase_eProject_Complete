<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\AvailabilitySlot;
use App\Models\Appointment;
use App\Models\PaymentInvoice;
use App\Models\User;
use Carbon\Carbon;

/**
 * Booking Schedule Controller
 * 
 * Handles booking schedule retrieval for lawyers. Provides available time slots,
 * appointment information, and pricing for customer booking pages.
 */
class BookingScheduleController extends Controller
{
    /**
     * Auto-cancel expired pending appointments
     * 
     * Cancels pending appointments that have passed their scheduled time
     * if no payment has been made.
     * 
     * @param int $lawyerId The lawyer ID to check appointments for
     * @return void
     */
    private function autoCancelExpired(int $lawyerId)
    {
        $now = now();
        $expiredPending = Appointment::where('lawyerid', $lawyerId)
            ->where('status', 'Pending')
            ->whereHas('slot', function ($q) use ($now) {
                $q->whereRaw("CONCAT(availabledate, ' ', starttime) < ?", [$now]);
            })->get();

        foreach ($expiredPending as $app) {
            $isPaid = PaymentInvoice::where('appointid', $app->appointid)->where('status', 'Success')->exists();
            if (!$isPaid) {
                $app->delete();
            }
        }
    }

    /**
     * Get lawyer booking schedule
     * 
     * Retrieves available time slots, booked appointments, lawyer information,
     * and pricing for the booking page. Auto-cancels expired appointments.
     * 
     * @param \Illuminate\Http\Request $request Request object
     * @param int $lawyerId The lawyer ID to get schedule for
     * 
     * @return \Illuminate\Http\JsonResponse JSON response with lawyer info, slots, appointments, and pricing
     */
    public function getSchedule(Request $request, $lawyerId)
    {
        try {
            $this->autoCancelExpired($lawyerId);
            $lawyerProfile = \App\Models\LawyerProfile::with([
                'user:userid,email,isactive',
                'specializations',
                'office'
            ])
                ->where('lawyerid', $lawyerId)
                ->first();

            if (!$lawyerProfile || !$lawyerProfile->user || !$lawyerProfile->user->isactive) {
                return response()->json([
                    'success' => false,
                    'message' => 'This lawyer is currently inactive or does not exist.'
                ], 403);
            }

            $now = now();
            $today = $now->toDateString();
            $currentTime = $now->toTimeString();

            $slots = AvailabilitySlot::where('lawyerid', $lawyerId)
                ->where('isavailable', true)
                ->where(function ($query) use ($today, $currentTime) {
                    $query->where('availabledate', '>', $today)
                        ->orWhere(function ($q) use ($today, $currentTime) {
                            $q->where('availabledate', '=', $today)
                                ->where('endtime', '>', $currentTime);
                        });
                })
                ->orderBy('availabledate', 'asc')
                ->get();

            $bookedAppointments = \App\Models\Appointment::where('lawyerid', $lawyerId)
                ->whereIn('status', ['Pending', 'Confirmed', 'Completed'])
                ->with(['slot:slotid,availabledate'])
                ->get();

            $firstSpec = $lawyerProfile->specializations->first();
            $specId = $firstSpec ? $firstSpec->specid : 1;

            $lawyerSpecSetting = DB::table('lawyer_specialties')
                ->where('lawyerid', $lawyerId)
                ->where('specid', $specId)
                ->first();

            $minprice = $lawyerSpecSetting ? $lawyerSpecSetting->specminprice : 300;

            return response()->json([
                'success' => true,
                'data' => [
                    'lawyer_info' => [
                        'userid'       => $lawyerId,
                        'fullname'     => $lawyerProfile->fullname,
                        'profileimage' => $lawyerProfile->profileimage,
                        'email'        => $lawyerProfile->user->email,
                        'phonenumber'  => $lawyerProfile->phonenumber,
                        'specname'     => $firstSpec->specname ?? 'Legal Consultation',
                        'address'      => $lawyerProfile->office->addressdetail ?? 'On-site consultation',
                        'server_time' => now()->toDateTimeString(),
                        'service_fee_rate' => 10
                    ],
                    'slots'        => $slots,
                    'appointments' => $bookedAppointments,


                    'price_list'   => [
                        '60'  => round((60 / 60) * $minprice * 1.1),
                        '120' => round((120 / 60) * $minprice * 1.1)
                    ]
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
