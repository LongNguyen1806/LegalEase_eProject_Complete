<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerProfile extends Model
{
    use HasFactory;

    protected $table = 'lawyer_profiles';
    protected $primaryKey = 'lawyerid';

    // Vì LawyerID là FK từ UserID, không phải số tự tăng
    public $incrementing = false;

    protected $fillable = [
        'lawyerid',
        'fullname',
        'phonenumber',
        'experienceyears',
        'bio',
        'profileimage',
        'isverified',
        'ispro',
        'min_price',
    ];

    protected $casts = [
        'isverified' => 'boolean',
        'ispro' => 'boolean',
        'min_price' => 'decimal:2',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if ($this->profileimage) {
            return asset('storage/lawyer_avatars/' . $this->profileimage);
        }

        return asset('asset/lawyer_avatars/default-avatar2.png');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'lawyerid', 'userid');
    }

    public function achievements()
    {
        return $this->hasMany(LawyerAchievement::class, 'lawyerid', 'lawyerid');
    }

    public function verification()
    {
        return $this->hasOne(LawyerVerification::class, 'lawyerid', 'lawyerid');
    }

    public function office()
    {
        return $this->hasOne(LawyerOffice::class, 'lawyerid', 'lawyerid');
    }

    public function specializations()
    {
        return $this->belongsToMany(
            Specialization::class,
            'lawyer_specialties',
            'lawyerid',
            'specid'
        );
    }

    public function availabilitySlots()
    {
        return $this->hasMany(AvailabilitySlot::class, 'lawyerid', 'lawyerid');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'lawyerid', 'lawyerid');
    }

    public function subscriptions()
    {
        return $this->hasMany(LawyerSubscription::class, 'lawyerid', 'lawyerid');
    }

    public function earning()
    {
        return $this->hasOne(LawyerEarning::class, 'lawyerid', 'lawyerid');
    }

    public function answers()
    {
        return $this->hasMany(QaAnswer::class, 'lawyerid', 'lawyerid');
    }
}
