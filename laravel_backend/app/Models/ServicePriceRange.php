<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServicePriceRange extends Model
{
    use HasFactory;

    protected $table = 'service_price_ranges';
    protected $primaryKey = 'priceid';

    protected $fillable = [
        'specid',
        'minprice',
        'maxprice',
    ];

    protected $casts = [
        'minprice' => 'decimal:2',
        'maxprice' => 'decimal:2',
    ];

    public function specialization()
    {
        return $this->belongsTo(Specialization::class, 'specid', 'specid');
    }
}