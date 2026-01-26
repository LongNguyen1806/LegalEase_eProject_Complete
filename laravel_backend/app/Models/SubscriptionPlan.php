<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $table = 'subscription_plans';
    protected $primaryKey = 'planid';

    protected $fillable = [
        'planname',
        'price',
        'features',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function lawyerSubscriptions()
    {
        return $this->hasMany(LawyerSubscription::class, 'planid', 'planid');
    }
}