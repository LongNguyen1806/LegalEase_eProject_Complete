<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\AvailabilitySlot;
use App\Models\Appointment;
use Illuminate\Support\Facades\Validator;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Availability Controller
 * 
 * Manages lawyer availability slots and work schedules. Handles creation, retrieval,
 * updating, and deletion of time slots that lawyers can make available for appointments.
 * Automatically marks past slots as unavailable and prevents modifications to slots
 * with existing bookings.
 */
class AvailabilityController extends Controller
{
    /**
     * Get availability slots
     * 
     * Retrieves availability slots for the authenticated lawyer. Automatically marks
     * past slots as unavailable. Supports filtering by type: 'upcoming' (default) or 'history'.
     * 
     * - Upcoming slots: Future dates or today's slots with end time >= current time
     * - History slots: Past dates or today's slots with end time < current time
     * 
     * Each slot includes a flag indicating if it has active bookings.
     * 
     * @param \Illuminate\Http\Request $request Request object containing optional 'type' query parameter
     *                                          Valid values: 'upcoming' (default), 'history'
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing list of availability slots
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $now = now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        AvailabilitySlot::where('lawyerid', $user->userid)
            ->where('isavailable', true)
            ->whereDoesntHave('appointments', function ($q) {
                $q->whereIn('status', ['Pending', 'Confirmed', 'Completed']);
            })
            ->where(function ($query) use ($today, $currentTime) {
                $query->where('availabledate', '<', $today)
                    ->orWhere(function ($q) use ($today, $currentTime) {
                        $q->where('availabledate', '=', $today)
                            ->where('endtime', '<', $currentTime);
                    });
            })
            ->update(['isavailable' => false]);

        $type = $request->query('type', 'upcoming');
        $query = AvailabilitySlot::where('lawyerid', $user->userid)
            ->withExists(['appointments as is_booked' => function ($q) {
                $q->whereIn('status', ['Pending', 'Confirmed', 'Completed']);
            }]);

        if ($type === 'history') {
            $query->where(function ($q) use ($today, $currentTime) {
                $q->where('availabledate', '<', $today)
                    ->orWhere(function ($subQ) use ($today, $currentTime) {
                        $subQ->where('availabledate', '=', $today)
                            ->where('endtime', '<', $currentTime);
                    });
            })
                ->orderBy('availabledate', 'desc');
        } else {
            $query->where(function ($q) use ($today, $currentTime) {
                $q->where('availabledate', '>', $today)
                    ->orWhere(function ($subQ) use ($today, $currentTime) {
                        $subQ->where('availabledate', '=', $today)
                            ->where('endtime', '>=', $currentTime);
                    });
            })
                ->orderBy('availabledate', 'asc');
        }

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * Create availability slots
     * 
     * Creates multiple availability slots for the authenticated lawyer across specified dates
     * with the same time range. Validates time conflicts and prevents creation of duplicate
     * or overlapping slots. Skips slots that are in the past or conflict with existing slots.
     * 
     * Only lawyers (roleid = 2) can create availability slots.
     * 
     * @param \Illuminate\Http\Request $request Request containing:
     *                                          - dates: array of date strings (required)
     *                                          - starttime: start time (required)
     *                                          - endtime: end time (required)
     * 
     * @return \Illuminate\Http\JsonResponse JSON response with creation status, count of created slots,
     *                                       and information about skipped slots
     *                                       Returns 201 on success, 403 if not a lawyer, 422 on validation error
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $validator = Validator::make($request->all(), [
            'dates'     => 'required|array',
            'dates.*'   => 'date|after_or_equal:today',
            'starttime' => 'required', 
            'endtime'   => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $timeStart = Carbon::parse($request->starttime)->format('H:i:s');
        $timeEnd = Carbon::parse($request->endtime)->format('H:i:s');

        if ($timeEnd <= $timeStart) {
            return response()->json(['message' => 'End time must be after start time'], 422);
        }

        $createdCount = 0;
        $skippedCount = 0;
        $pastTimeCount = 0; 
        DB::beginTransaction();
        try {
            $now = Carbon::now();

            foreach ($request->dates as $dateStr) {
               
                $startDateTime = Carbon::parse($dateStr . ' ' . $timeStart);

                if ($startDateTime->isPast()) {
                    $pastTimeCount++;
                    continue;
                }

                $exists = AvailabilitySlot::where('lawyerid', $user->userid)
                    ->where('availabledate', $dateStr)
                    ->where(function ($query) use ($timeStart, $timeEnd) {
                        $query->where('starttime', '<', $timeEnd)
                            ->where('endtime', '>', $timeStart);
                    })->exists();

                if (!$exists) {
                    AvailabilitySlot::create([
                        'lawyerid'      => $user->userid,
                        'availabledate' => $dateStr,
                        'starttime'     => $timeStart,
                        'endtime'       => $timeEnd,
                        'isavailable'   => true,
                    ]);
                    $createdCount++;
                } else {
                    $skippedCount++;
                }
            }
            DB::commit();

            $message = "Successfully created $createdCount work shifts.";
            if ($skippedCount > 0) $message .= " Skipped $skippedCount duplicate shifts.";
            if ($pastTimeCount > 0) $message .= " Skipped $pastTimeCount shifts because the time has already passed.";


            return response()->json([
                'success' => true,
                'count'   => $createdCount,
                'message' => $message
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'system error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update availability slot
     * 
     * Updates the time range of an existing availability slot. Validates that:
     * - The slot belongs to the authenticated lawyer
     * - The slot has no active bookings (Pending, Confirmed, or Completed)
     * - The new start time is not in the past
     * - The end time is after the start time
     * 
     * @param \Illuminate\Http\Request $request Request containing:
     *                                          - starttime: new start time (required)
     *                                          - endtime: new end time (required)
     * @param int $id The ID of the availability slot to update
     * 
     * @return \Illuminate\Http\JsonResponse JSON response indicating success or failure
     *                                       Returns 200 on success, 404 if slot not found,
     *                                       400 if slot has bookings or validation fails
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $slot = AvailabilitySlot::where('slotid', $id)->where('lawyerid', $user->userid)->first();

        if (!$slot) return response()->json(['message' => 'Work shift not found.'], 404);

        $hasBooked = Appointment::where('slotid', $id)
            ->whereIn('status', ['Pending', 'Confirmed', 'Completed'])
            ->exists();
        if ($hasBooked) {
            return response()->json(['message' => 'Cannot edit a shift that already has bookings.'], 400);
        }

        $dateOnly = Carbon::parse($slot->availabledate)->toDateString();

        $newStartTimeStr = $request->starttime;
        $newEndTimeStr = $request->endtime;

        $newStartDateTime = Carbon::parse($dateOnly . ' ' . $newStartTimeStr);
        $newEndDateTime = Carbon::parse($dateOnly . ' ' . $newEndTimeStr);

        if ($newStartDateTime->isPast()) {
            return response()->json([
                'message' => 'Cannot edit a time slot in the past. The start time must be after the current time.'
            ], 400);
        }

        if ($newEndDateTime->lte($newStartDateTime)) {
            return response()->json(['message' => 'The end time must be after the start time.'], 400);
        }

        $slot->update([
            'starttime' => $newStartDateTime->format('H:i:s'),
            'endtime'   => $newEndDateTime->format('H:i:s'),
            'isavailable' => true
        ]);

        return response()->json(['success' => true, 'message' => 'Time slot updated successfully.']);
    }

    /**
     * Delete availability slot
     * 
     * Deletes an availability slot if it has no active appointments. Validates that:
     * - The slot belongs to the authenticated lawyer
     * - The slot has no pending or confirmed appointments
     * 
     * Completed appointments do not prevent deletion.
     * 
     * @param int $id The ID of the availability slot to delete
     * 
     * @return \Illuminate\Http\JsonResponse JSON response indicating success or failure
     *                                       Returns 200 on success, 404 if slot not found,
     *                                       400 if slot has active appointments
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $slot = AvailabilitySlot::where('slotid', $id)->where('lawyerid', $user->userid)->first();

        if (!$slot) return response()->json(['message' => 'Not found.'], 404);

        $hasActiveApp = Appointment::where('slotid', $id)->whereIn('status', ['Pending', 'Confirmed'])->exists();
        if ($hasActiveApp) {
            return response()->json(['message' => 'This work shift has pending appointments and cannot be deleted.'], 400);
        }

        $slot->delete();
        return response()->json(['success' => true, 'message' => 'Work shift deleted successfully.']);
    }
}
