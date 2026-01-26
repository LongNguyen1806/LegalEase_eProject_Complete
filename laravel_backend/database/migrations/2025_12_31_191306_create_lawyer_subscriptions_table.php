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
        Schema::create('lawyer_subscriptions', function (Blueprint $table) {
            $table->id('subid'); 
            $table->unsignedBigInteger('lawyerid'); 
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade'); 
            $table->unsignedBigInteger('planid'); 
            $table->foreign('planid')->references('planid')->on('subscription_plans')->onDelete('cascade'); 
            $table->datetime('startdate'); 
            $table->datetime('enddate'); 
            $table->string('status', 20); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lawyer_subscriptions');
    }
};
