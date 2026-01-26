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
        Schema::create('payments_invoices', function (Blueprint $table) {
            $table->id('invid');
            $table->unsignedBigInteger('userid');
            $table->foreign('userid')->references('userid')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('appointid')->nullable();
            $table->foreign('appointid')->references('appointid')->on('appointments')->onDelete('set null');
            $table->unsignedBigInteger('subid')->nullable();
            $table->foreign('subid')->references('subid')->on('lawyer_subscriptions')->onDelete('set null');
            $table->string('transactionno', 100)->unique();
            $table->string('paymentmethod', 50);
            $table->decimal('amount', 10, 2);
            $table->decimal('refundamount', 10, 2);
            $table->string('status', 20);
            $table->dateTime('createdat');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments_invoices');
    }
};
