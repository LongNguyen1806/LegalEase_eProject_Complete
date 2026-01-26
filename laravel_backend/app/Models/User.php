<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\LawyerProfile;
use App\Models\CustomerProfile;
use App\Models\LawyerOffice;
use App\Models\Specialization;
use App\Models\LawyerVerification;
use App\Models\LawyerAchievement;
use App\Models\Review;
use App\Models\Appointment;
use App\Models\AvailabilitySlot;
use App\Models\Notification;
use App\Models\SystemAuditLog;
use App\Models\Role;
use App\Models\AiChatHistory; 

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users'; 

    protected $primaryKey = 'userid'; 

    protected $fillable = [
        'email',
        'password',
        'roleid',
        'isactive',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'isactive' => 'boolean',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'roleid', 'roleid');
    }

    public function lawyerProfile()
    {
        return $this->hasOne(LawyerProfile::class, 'lawyerid', 'userid');
    }

    public function customerProfile()
    {
        return $this->hasOne(CustomerProfile::class, 'customerid', 'userid');
    }

    public function aiChatHistory()
    {
        return $this->hasMany(AiChatHistory::class, 'userid', 'userid');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'userid', 'userid');
    }

    public function auditLogs()
    {
        return $this->hasMany(SystemAuditLog::class, 'adminid', 'userid');
    }

    public function office()
    {
        return $this->hasOne(LawyerOffice::class, 'lawyerid', 'userid');
    }

    public function specializations()
    {
        return $this->belongsToMany(
            Specialization::class,
            'lawyer_specialties',
            'lawyerid',
            'specid'
        )->withPivot('specminprice', 'specmaxprice')
            ->withTimestamps();
    }

    public function reviews()
    {
        return $this->hasManyThrough(
            Review::class,
            Appointment::class,
            'lawyerid',
            'appointid',
            'userid',
            'appointid'
        );
    }

    public function availabilitySlots()
    {
        return $this->hasMany(AvailabilitySlot::class, 'lawyerid', 'userid');
    }

    public function verification()
    {
        return $this->hasOne(LawyerVerification::class, 'lawyerid', 'userid')->latestOfMany('verifyid');
    }

    public function verifications()
    {
        return $this->hasMany(LawyerVerification::class, 'lawyerid', 'userid')->orderBy('created_at', 'desc');
    }

    public function achievements()
    {
        return $this->hasMany(LawyerAchievement::class, 'lawyerid', 'userid');
    }
}
