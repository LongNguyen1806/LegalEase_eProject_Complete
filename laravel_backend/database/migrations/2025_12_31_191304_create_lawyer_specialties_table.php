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
        Schema::create('lawyer_specialties', function (Blueprint $table) {

            $table->unsignedBigInteger('lawyerid'); 
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade'); 
            $table->unsignedBigInteger('specid'); 
            $table->foreign('specid')->references('specid')->on('specializations')->onDelete('cascade'); 
            $table->decimal('specminprice', 15, 2)->default(0); 
            $table->decimal('specmaxprice', 15, 2)->default(0); 
            $table->primary(['lawyerid', 'specid']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_specialties');
    }
};
