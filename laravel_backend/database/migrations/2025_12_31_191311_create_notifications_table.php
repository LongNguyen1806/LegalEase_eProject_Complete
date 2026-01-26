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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notifid');
            $table->unsignedBigInteger('userid'); 
            $table->foreign('userid')->references('userid')->on('users')->onDelete('cascade');
            $table->text('message'); 
            $table->string('type', 20); 
            $table->boolean('issentemail')->default(false); 
            $table->string('linkurl', 500)->nullable();
            $table->datetime('sentat')->nullable();
            $table->boolean('isread')->default(false);
            $table->timestamps();
            $table->index(['userid', 'isread']);
            $table->index('sentat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
