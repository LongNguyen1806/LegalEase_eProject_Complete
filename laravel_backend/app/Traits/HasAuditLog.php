<?php

namespace App\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\SystemAuditLog;

trait HasAuditLog
{
    /**
     * Record admin activity logs
     */
    protected function logAction($action)
    {
        try {
            SystemAuditLog::create([
                'adminid'   => Auth::id(),
                'action'    => $action,
                'timestamp' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("Audit Log Error: " . $e->getMessage());
        }
    }
}
