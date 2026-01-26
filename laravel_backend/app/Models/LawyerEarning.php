<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerEarning extends Model
{
    use HasFactory;

    protected $table = 'lawyer_earnings';
    protected $primaryKey = 'earnid';

    protected $fillable = [
        'lawyerid',
        'totalmatches',
        'totalcommissionpaid',
    ];

    protected $casts = [
        'totalcommissionpaid' => 'decimal:2',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }
}