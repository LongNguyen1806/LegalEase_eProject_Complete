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
        Schema::create('customer_profiles', function (Blueprint $table) {
            $table->unsignedBigInteger('customerid')->primary();
            $table->foreign('customerid')->references('userid')->on('users')->onDelete('cascade');
            $table->string('fullname', 100);
            $table->string('phonenumber', 20)->nullable();
            $table->string('profileimage', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_profiles');
    }
};
