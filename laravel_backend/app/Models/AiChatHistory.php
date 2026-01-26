<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiChatHistory extends Model
{
    use HasFactory;

    protected $table = 'ai_chat_history';
    protected $primaryKey = 'chatid';

    protected $fillable = [
        'userid',
        'question',
        'answer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'userid', 'userid');
    }
}