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
        Schema::create('lawyer_profiles', function (Blueprint $table) {
            $table->unsignedBigInteger('lawyerid')->primary();
            $table->foreign('lawyerid')->references('userid')->on('users')->onDelete('cascade');
            $table->string('fullname', 100);
            $table->string('phonenumber', 20)->nullable();
            $table->integer('experienceyears')->nullable();
            $table->text('bio')->nullable();
            $table->string('profileimage', 255)->nullable();
            $table->boolean('isverified')->default(false);
            $table->boolean('ispro')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_profiles');
    }
};
