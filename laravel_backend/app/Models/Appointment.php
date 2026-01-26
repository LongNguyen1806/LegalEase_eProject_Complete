<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\AvailabilitySlot;
use App\Models\CustomerProfile;
use App\Models\LawyerProfile;
use App\Models\PaymentInvoice;
use App\Models\Review;
use Carbon\Carbon;

class Appointment extends Model
{
    use HasFactory;

    protected $table = 'appointments';
    protected $primaryKey = 'appointid';

    protected $fillable = [
        'slotid',
        'customerid',
        'lawyerid',
        'status',
        'packagename',
        'duration',
        'starttime',
        'note',
        'commissionfee',
    ];

    protected $casts = [
        'commissionfee' => 'decimal:2',
    ];
    
    public function slot()
    {
        return $this->belongsTo(AvailabilitySlot::class, 'slotid', 'slotid');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerProfile::class, 'customerid', 'customerid');
    }
    
    public function lawyer()
    {
       return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }

    public function invoice()
    {
        return $this->hasOne(PaymentInvoice::class, 'appointid', 'appointid');
    }

    public function review()
    {
        return $this->hasOne(Review::class, 'appointid', 'appointid');
    }
   
    public function getEndTimeAttribute()
    {
        if (!$this->starttime || !$this->duration) return null;
        return Carbon::parse($this->starttime)->addMinutes($this->duration)->format('H:i:s');
    }

    public function getFullStartDateTimeAttribute()
    {
        if (!$this->slot || !$this->starttime) return null;
        return Carbon::parse($this->slot->availabledate . ' ' . $this->starttime);
    }
}
