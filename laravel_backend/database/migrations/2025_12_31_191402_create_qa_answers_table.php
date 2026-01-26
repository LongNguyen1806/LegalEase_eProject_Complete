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
        Schema::create('qa_answers', function (Blueprint $table) {
            $table->id('answerid');
            $table->unsignedBigInteger('questionid');
            $table->foreign('questionid')->references('questionid')->on('qa_questions')->onDelete('cascade');
            $table->unsignedBigInteger('lawyerid');
            $table->foreign('lawyerid')->references('lawyerid')->on('lawyer_profiles')->onDelete('cascade');
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
        Schema::dropIfExists('qa_answers');
    }
};
