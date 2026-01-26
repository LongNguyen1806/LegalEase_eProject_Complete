<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerSubscription extends Model
{
    use HasFactory;

    protected $table = 'lawyer_subscriptions';
    protected $primaryKey = 'subid';

    protected $fillable = [
        'lawyerid',
        'planid',
        'startdate',
        'enddate',
        'status',
    ];

    protected $casts = [
        'startdate' => 'datetime',
        'enddate'   => 'datetime',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'planid', 'planid');
    }

    public function invoice()
    {
        return $this->hasOne(PaymentInvoice::class, 'subid', 'subid');
    }
}
