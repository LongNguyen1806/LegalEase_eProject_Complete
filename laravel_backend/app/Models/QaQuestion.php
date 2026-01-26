<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QaQuestion extends Model
{
    use HasFactory;

    protected $table = 'qa_questions';
    protected $primaryKey = 'questionid';

    protected $fillable = [
        'customerid',
        'title',
        'content',
        'isapproved', 
    ];

    protected $casts = [
        'isapproved' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customerid', 'userid');
    }

    public function answers()
    {
        return $this->hasMany(QaAnswer::class, 'questionid', 'questionid');
    }
}