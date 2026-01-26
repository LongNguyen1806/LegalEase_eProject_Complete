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
        Schema::create('availability_slots', function (Blueprint $table) {
            $table->id('slotid'); 
            $table->unsignedBigInteger('lawyerid'); 
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade'); 
            $table->date('availabledate'); 
            $table->time('starttime');
            $table->time('endtime'); 
            $table->boolean('isavailable')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('availability_slots');
    }
};
