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
        Schema::create('service_price_ranges', function (Blueprint $table) {
            $table->id('priceid'); 
            $table->unsignedBigInteger('specid');
            $table->foreign('specid')->references('specid')->on('specializations')->onDelete('cascade');
            $table->decimal('minprice', 10, 2);
            $table->decimal('maxprice', 10, 2); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_price_ranges');
    }
};
