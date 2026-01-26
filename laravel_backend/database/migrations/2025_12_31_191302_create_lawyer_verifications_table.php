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
        Schema::create('lawyer_verifications', function (Blueprint $table) {
            $table->id('verifyid');
            $table->unsignedBigInteger('lawyerid');
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade');
            $table->string('idcardnumber', 20);
            $table->string('licensenumber', 50);
            $table->text('documentimage');
            $table->string('status', 20)->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_verifications');
    }
};
