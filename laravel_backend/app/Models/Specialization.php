<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Specialization extends Model
{
    use HasFactory;

    protected $table = 'specializations';
    protected $primaryKey = 'specid';

    protected $fillable = [
        'specname',
    ];
    
    public function lawyers()
    {
        return $this->belongsToMany(
            LawyerProfile::class,
            'lawyer_specialties', 
            'specid',             
            'lawyerid'           
        )->withPivot('specminprice', 'specmaxprice') 
            ->withTimestamps();
    }

    public function knowledgeBase()
    {
        return $this->hasMany(LegalKnowledgeBase::class, 'specid', 'specid');
    }

    public function priceRange()
    {
        return $this->hasOne(ServicePriceRange::class, 'specid', 'specid');
    }

    public function users()
    {
        return $this->belongsToMany(
            User::class,
            'lawyer_specialties',
            'specid',
            'lawyerid'
        )->withPivot('specminprice', 'specmaxprice')
            ->withTimestamps();
    }
}
