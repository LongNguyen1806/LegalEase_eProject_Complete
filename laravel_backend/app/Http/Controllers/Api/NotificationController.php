<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;

/**
 * Class NotificationController
 * * Manages the lifecycle of user notifications, including retrieval, 
 * read-status tracking, and deletion. This controller ensures users stay 
 * updated on appointment changes, verification status, and system alerts.
 * * @package App\Http\Controllers\Api
 */
class NotificationController extends Controller
{
    /**
     * Retrieve the most recent notifications for the authenticated user.
     * * Fetches the last 20 notifications ordered by the sending timestamp. 
     * Includes a manual map to ensure the 'isread' flag is cast to an integer 
     * for consistent frontend boolean evaluation.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $userId = Auth::user()->userid;

        $notifications = Notification::where('userid', $userId)
            ->orderBy('sentat', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($n) {
                $n->isread = (int)$n->isread;
                return $n;
            });

        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);
    }

    /**
     * Get the total count of unread notifications for the current user.
     * * Primary use case is for displaying notification badges/dots in the UI.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnreadCount()
    {
        $userId = Auth::user()->userid;

        $count = Notification::where('userid', $userId)
            ->where('isread', false)
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => (int)$count
        ]);
    }

    /**
     * Mark a specific notification as read.
     * * Security Check: Ensures the notification belongs to the authenticated 
     * user before performing the update.
     *
     * @param  int  $id The notification ID (notifid)
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAsRead($id)
    {
        $userId = Auth::user()->userid;

        Notification::where('notifid', $id)
            ->where('userid', $userId)
            ->update(['isread' => true]);

        return response()->json([
            'success' => true
        ]);
    }

    /**
     * Mark all currently unread notifications as read for the authenticated user.
     * * A bulk update operation to clear the user's notification inbox.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function markAllAsRead()
    {
        $userId = Auth::user()->userid;

        Notification::where('userid', $userId)
            ->where('isread', false)
            ->update(['isread' => true]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications have been marked as read'
        ]);
    }

    /**
     * Permanently delete a specific notification.
     *
     * @param  int  $id The notification ID (notifid)
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $userId = Auth::user()->userid;

        $notification = Notification::where('notifid', $id)
            ->where('userid', $userId)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found'
            ], 404);
        }

        $notification->delete();
        return response()->json([
            'success' => true
        ]);
    }

    public function destroyAll()
    {
        $userId = Auth::user()->userid;
        Notification::where('userid', $userId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'All notifications deleted'
        ]);
    }
}
