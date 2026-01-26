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
        Schema::create('qa_questions', function (Blueprint $table) {
            $table->id('questionid');
            $table->unsignedBigInteger('customerid');
            $table->foreign('customerid')->references('customerid')->on('customer_profiles')->onDelete('cascade');
            $table->string('title', 255);
            $table->text('content');
            $table->boolean('isapproved')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qa_questions');
    }
};
