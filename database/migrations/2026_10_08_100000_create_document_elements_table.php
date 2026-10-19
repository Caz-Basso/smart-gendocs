<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_elements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('type'); // 'header', 'footer'
            $table->string('image_path');
            $table->decimal('width', 8, 2)->default(180.00); // mm
            $table->decimal('height', 8, 2)->default(25.00); // mm
            $table->decimal('position_x', 8, 2)->default(15.00); // mm
            $table->decimal('position_y', 8, 2)->default(10.00); // mm
            $table->string('page_target')->default('all'); // 'all', 'first', 'except_first', 'custom'
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_elements');
    }
};

