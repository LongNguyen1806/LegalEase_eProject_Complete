<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Appointment;

class Review extends Model
{
    use HasFactory;

    protected $table = 'reviews';
    protected $primaryKey = 'revid';

    protected $fillable = [
        'appointid',
        'rating',  
        'comment',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointid', 'appointid');
    }
}