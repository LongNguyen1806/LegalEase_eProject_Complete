<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';
    protected $primaryKey = 'notifid';

    protected $fillable = [
        'userid',
        'message',
        'type',        
        'issentemail',
        'linkurl',
        'sentat',
        'isread',
    ];

    protected $casts = [
        'issentemail' => 'boolean',
        'isread'      => 'boolean',
        'sentat'      => 'datetime',
    ];
    public $timestamps = false;
    
    public function user()
    {
        return $this->belongsTo(User::class, 'userid', 'userid');
    }
}
