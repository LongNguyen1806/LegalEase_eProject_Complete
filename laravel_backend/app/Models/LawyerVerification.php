<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LawyerVerification extends Model
{
    use HasFactory;

    protected $table = 'lawyer_verifications';
    protected $primaryKey = 'verifyid';

    protected $fillable = [
        'lawyerid',
        'idcardnumber',
        'licensenumber',
        'documentimage',
        'status',
    ];

    public function lawyer()
    {
        return $this->belongsTo(LawyerProfile::class, 'lawyerid', 'lawyerid');
    }

    protected $casts = [
        'documentimage' => 'array', 
    ];
}