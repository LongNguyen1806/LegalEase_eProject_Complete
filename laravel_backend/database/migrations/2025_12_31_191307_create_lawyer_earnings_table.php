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
        Schema::create('lawyer_earnings', function (Blueprint $table) {
            $table->id('earnid'); 
            $table->unsignedBigInteger('lawyerid'); 
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade'); 
            $table->integer('totalmatches')->default(0);
            $table->decimal('totalcommissionpaid', 12, 2)->default(0); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_earnings');
    }
};
