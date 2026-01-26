<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $table = 'locations';
    protected $primaryKey = 'locid';

    protected $fillable = [
        'cityname',
    ];

    public function lawyerOffices()
    {
        return $this->hasMany(LawyerOffice::class, 'locid', 'locid');
    }
}