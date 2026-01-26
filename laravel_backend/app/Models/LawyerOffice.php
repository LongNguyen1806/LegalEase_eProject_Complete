<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerOffice extends Model
{
    use HasFactory;

    protected $table = 'lawyer_offices';
    protected $primaryKey = 'officeid';

    protected $fillable = [
        'lawyerid',
        'locid',
        'latitude',
        'longitude',
        'addressdetail',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'locid', 'locid');
    }

}