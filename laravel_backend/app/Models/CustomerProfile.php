<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerProfile extends Model
{
    use HasFactory;

    protected $table = 'customer_profiles';
    protected $primaryKey = 'customerid';

    public $incrementing = false;

    protected $fillable = [
        'customerid',
        'fullname',
        'phonenumber',
        'profileimage',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'customerid', 'userid');
    }

    public function questions()
    {
        return $this->hasMany(QaQuestion::class, 'customerid', 'customerid');
    }

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if ($this->profileimage) {
            return asset('storage/customer_avatars/' . $this->profileimage);
        }

        return asset('asset/customer_avatars/default-avatar3.png');
    }
}
