<?php

namespace App\Traits;

use App\Models\Notification;
use Carbon\Carbon;

trait HasNotifications
{
    /**
     * Common function used to create a notification in the database
     * * @param int $userId Recipient user ID
     * @param string $message Notification content
     * @param string $linkurl Redirect URL (can be null)
     * @param string $type Notification type (default is 'system')
     * @return Notification
     */
    public function sendNotification($userId, $message, $linkurl = null, $type = 'system')
    {
        return Notification::create([
            'userid'      => $userId,
            'message'     => $message,
            'type'        => $type,
            'linkurl'     => $linkurl,
            'sentat'      => now(),
            'isread'      => false,
            'issentemail' => false,
        ]);
    }
}
