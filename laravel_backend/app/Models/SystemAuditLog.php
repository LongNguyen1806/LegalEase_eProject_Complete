<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemAuditLog extends Model
{
    use HasFactory;

    protected $table = 'system_audit_logs';
    protected $primaryKey = 'logid';

    public $timestamps = false;

    protected $fillable = [
        'adminid',
        'action',
        'timestamp',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    public function admin()
    {
        return $this->belongsTo(User::class, 'adminid', 'userid');
    }
}