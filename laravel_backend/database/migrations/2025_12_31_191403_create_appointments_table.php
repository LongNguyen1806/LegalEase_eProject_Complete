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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id('appointid');
            $table->unsignedBigInteger('slotid');
            $table->foreign('slotid')->references('slotid')->on('availability_slots')->onDelete('cascade');
            $table->unsignedBigInteger('customerid');
            $table->foreign('customerid')->references('customerid')->on('customer_profiles')->onDelete('cascade');
            $table->unsignedBigInteger('lawyerid');
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade');
            $table->string('packagename', 100);
            $table->integer('duration')->default(60);
            $table->time('starttime')->nullable();
            $table->text('note');
            $table->string('status', 20);
            $table->decimal('commissionfee', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
