<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QaAnswer extends Model
{
    use HasFactory;

    protected $table = 'qa_answers';
    protected $primaryKey = 'answerid';

    protected $fillable = [
        'questionid',
        'lawyerid',
        'content',
        'isapproved',
    ];

    protected $casts = [
        'isapproved' => 'boolean',
    ];


    public function question()
    {
        return $this->belongsTo(QaQuestion::class, 'questionid', 'questionid');
    }

    public function lawyer()
    {
        return $this->belongsTo(User::class, 'lawyerid', 'userid');
    }
}