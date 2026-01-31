<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('legal_knowledge_base', function (Blueprint $table) {
            $table->fullText('content');

            $table->index('specid');
        });
    }

    public function down(): void
    {
        Schema::table('legal_knowledge_base', function (Blueprint $table) {
            $table->dropFullText(['content']);
            $table->dropIndex(['specid']);
        });
    }
};
