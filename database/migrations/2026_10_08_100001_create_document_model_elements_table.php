<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_model_elements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_model_id')->constrained('document_models')->cascadeOnDelete();
            $table->foreignUuid('document_element_id')->constrained('document_elements')->restrictOnDelete();
            $table->decimal('position_x', 8, 2)->nullable(); // override em mm
            $table->decimal('position_y', 8, 2)->nullable(); // override em mm
            $table->decimal('width', 8, 2)->nullable(); // override em mm
            $table->decimal('height', 8, 2)->nullable(); // override em mm
            $table->boolean('repeat_all_pages')->default(true);
            $table->json('pages')->nullable(); // ex: [1, 2] quando repeat_all_pages = false
            $table->integer('z_index')->default(10);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_model_elements');
    }
};

