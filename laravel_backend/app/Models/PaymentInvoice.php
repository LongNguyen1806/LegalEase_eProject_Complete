<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentInvoice extends Model
{
    use HasFactory;

    protected $table = 'payments_invoices';
    protected $primaryKey = 'invid';

    protected $fillable = [
        'userid',
        'appointid',      
        'subid',          
        'transactionno',
        'paymentmethod',
        'amount',
        'refundamount',
        'status',         
        'createdat',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'createdat' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'userid', 'userid');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointid', 'appointid');
    }

    public function subscription()
    {
        return $this->belongsTo(LawyerSubscription::class, 'subid', 'subid');
    }
}