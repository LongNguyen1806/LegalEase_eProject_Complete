<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerAchievement extends Model
{
    use HasFactory;

    protected $table = 'lawyer_achievements';
    protected $primaryKey = 'achieveid';
    
    protected $fillable = [
        'lawyerid',
        'title',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }
}