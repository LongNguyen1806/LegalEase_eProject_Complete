<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('legal_knowledge_base', function (Blueprint $table) {
        $table->id('lawid');
        $table->unsignedBigInteger('specid'); 
        $table->foreign('specid')->references('specid')->on('specializations')->onDelete('cascade'); 
        $table->string('lawname', 255);
        $table->string('title', 255); 
        $table->longText('content'); 
        $table->integer('chunkorder')->default(0);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('legal_knowledge_base');
    }
};
