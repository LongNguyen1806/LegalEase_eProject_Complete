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
        Schema::create('lawyer_achievements', function (Blueprint $table) {
            $table->id('achieveid');
            $table->unsignedBigInteger('lawyerid');
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade');
            $table->string('title', 255);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_achievements');
    }
};
