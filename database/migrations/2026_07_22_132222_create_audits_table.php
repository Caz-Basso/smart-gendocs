<?php

declare(strict_types=1);

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
        $connectionConfig = config('audit.drivers.database.connection');
        $connection = is_string($connectionConfig) ? $connectionConfig : config()->string('database.default');
        $table = config()->string('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->create($table, function (Blueprint $table): void {
            $morphPrefix = config()->string('audit.user.morph_prefix', 'user');

            $table->bigIncrements('id');
            $table->nullableUuidMorphs($morphPrefix);
            $table->string('event');
            $table->uuidMorphs('auditable');
            $table->text('old_values')->nullable();
            $table->text('new_values')->nullable();
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 1023)->nullable();
            $table->string('tags')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $connectionConfig = config('audit.drivers.database.connection');
        $connection = is_string($connectionConfig) ? $connectionConfig : config()->string('database.default');
        $table = config()->string('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->drop($table);
    }
};
