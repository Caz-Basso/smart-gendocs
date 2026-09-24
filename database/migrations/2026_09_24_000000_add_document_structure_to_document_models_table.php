<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_models', function (Blueprint $table): void {
            $table->json('document_structure')->nullable()->after('extracted_text');
        });
    }

    public function down(): void
    {
        Schema::table('document_models', function (Blueprint $table): void {
            $table->dropColumn('document_structure');
        });
    }
};
