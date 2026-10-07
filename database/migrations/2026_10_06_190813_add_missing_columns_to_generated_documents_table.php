<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('generated_documents', function (Blueprint $table): void {
            $table->string('model_key')->nullable()->after('document_model_id');
            $table->json('data')->nullable()->after('name');
            $table->json('preview')->nullable()->after('data');
            $table->json('fields')->nullable()->after('preview');
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('generated_documents', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropColumn(['model_key', 'data', 'preview', 'fields']);
        });
    }
};
