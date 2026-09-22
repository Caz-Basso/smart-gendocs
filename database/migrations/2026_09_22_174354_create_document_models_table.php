<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_models', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('template_path')->nullable();
            $table->text('extracted_text')->nullable();
            $table->json('fields')->nullable();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_models');
    }
};
