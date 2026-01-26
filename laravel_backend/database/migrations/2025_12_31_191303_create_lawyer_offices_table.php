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
        Schema::create('lawyer_offices', function (Blueprint $table) {
            $table->id('officeid'); 
            $table->unsignedBigInteger('lawyerid');
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade');
            $table->unsignedBigInteger('locid');
            $table->foreign('locid')->references('locid')->on('locations')->onDelete('cascade');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('addressdetail', 255);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_offices');
    }
};
