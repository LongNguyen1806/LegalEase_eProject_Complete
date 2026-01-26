<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LegalKnowledgeBase extends Model
{
    use HasFactory;

    protected $table = 'legal_knowledge_base';
    protected $primaryKey = 'lawid';

    protected $fillable = [
        'specid',
        'lawname',
        'title',
        'content',
        'chunkorder' 
    ];

    public function specialization()
    {
        return $this->belongsTo(Specialization::class, 'specid', 'specid');
    }
}
