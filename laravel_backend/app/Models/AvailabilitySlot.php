<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AvailabilitySlot extends Model
{
    use HasFactory;

    protected $table = 'availability_slots';
    protected $primaryKey = 'slotid';

    protected $fillable = [
        'lawyerid',
        'availabledate',
        'starttime',
        'endtime',
        'isavailable',
    ];

    protected $casts = [
        'availabledate' => 'date',
        'isavailable' => 'boolean',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'slotid', 'slotid');
    }

    public function isActive()
    {

        return $this->isavailable && $this->availabledate >= now()->toDateString();
    }
    protected function serializeDate(\DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }
}
