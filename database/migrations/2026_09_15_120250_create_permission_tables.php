<?php

declare(strict_types=1);

use Illuminate\Contracts\Cache\Factory;
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
        $teams = config()->boolean('permission.teams');
        $permissionsTable = config()->string('permission.table_names.permissions');
        $rolesTable = config()->string('permission.table_names.roles');
        $modelHasPermissionsTable = config()->string('permission.table_names.model_has_permissions');
        $modelHasRolesTable = config()->string('permission.table_names.model_has_roles');
        $roleHasPermissionsTable = config()->string('permission.table_names.role_has_permissions');
        $rolePivotKey = config('permission.column_names.role_pivot_key');
        $permissionPivotKey = config('permission.column_names.permission_pivot_key');
        $pivotRole = is_string($rolePivotKey) ? $rolePivotKey : 'role_id';
        $pivotPermission = is_string($permissionPivotKey) ? $permissionPivotKey : 'permission_id';
        $modelMorphKey = config()->string('permission.column_names.model_morph_key');
        $teamForeignKey = config()->string('permission.column_names.team_foreign_key');

        throw_if($permissionsTable === '' || $rolesTable === '', 'Error: config/permission.php not loaded. Run [php artisan config:clear] and try again.');
        throw_if($teams && $teamForeignKey === '', 'Error: team_foreign_key on config/permission.php not loaded. Run [php artisan config:clear] and try again.');

        /**
         * See `docs/prerequisites.md` for suggested lengths on 'name' and 'guard_name' if "1071 Specified key was too long" errors are encountered.
         */
        Schema::create($permissionsTable, static function (Blueprint $table): void {
            $table->id(); // permission id
            $table->string('name');
            $table->string('guard_name');
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
        });

        /**
         * See `docs/prerequisites.md` for suggested lengths on 'name' and 'guard_name' if "1071 Specified key was too long" errors are encountered.
         */
        Schema::create($rolesTable, static function (Blueprint $table) use ($teams, $teamForeignKey): void {
            $table->id(); // role id
            if ($teams || config()->boolean('permission.testing', false)) { // permission.testing is a fix for sqlite testing
                $table->unsignedBigInteger($teamForeignKey)->nullable();
                $table->index($teamForeignKey, 'roles_team_foreign_key_index');
            }

            $table->string('name');
            $table->string('guard_name');
            $table->timestamps();
            if ($teams || config()->boolean('permission.testing', false)) {
                $table->unique([$teamForeignKey, 'name', 'guard_name']);
            } else {
                $table->unique(['name', 'guard_name']);
            }
        });

        Schema::create($modelHasPermissionsTable, static function (Blueprint $table) use ($permissionsTable, $modelMorphKey, $pivotPermission, $teams, $teamForeignKey): void {
            $table->unsignedBigInteger($pivotPermission);

            $table->string('model_type');
            $table->uuid($modelMorphKey);
            $table->index([$modelMorphKey, 'model_type'], 'model_has_permissions_model_id_model_type_index');

            $table->foreign($pivotPermission)
                ->references('id') // permission id
                ->on($permissionsTable)
                ->cascadeOnDelete();
            if ($teams) {
                $table->unsignedBigInteger($teamForeignKey);
                $table->index($teamForeignKey, 'model_has_permissions_team_foreign_key_index');

                $table->primary([$teamForeignKey, $pivotPermission, $modelMorphKey, 'model_type'],
                    'model_has_permissions_permission_model_type_primary');
            } else {
                $table->primary([$pivotPermission, $modelMorphKey, 'model_type'],
                    'model_has_permissions_permission_model_type_primary');
            }
        });

        Schema::create($modelHasRolesTable, static function (Blueprint $table) use ($rolesTable, $modelMorphKey, $pivotRole, $teams, $teamForeignKey): void {
            $table->unsignedBigInteger($pivotRole);

            $table->string('model_type');
            $table->uuid($modelMorphKey);
            $table->index([$modelMorphKey, 'model_type'], 'model_has_roles_model_id_model_type_index');

            $table->foreign($pivotRole)
                ->references('id') // role id
                ->on($rolesTable)
                ->cascadeOnDelete();
            if ($teams) {
                $table->unsignedBigInteger($teamForeignKey);
                $table->index($teamForeignKey, 'model_has_roles_team_foreign_key_index');

                $table->primary([$teamForeignKey, $pivotRole, $modelMorphKey, 'model_type'],
                    'model_has_roles_role_model_type_primary');
            } else {
                $table->primary([$pivotRole, $modelMorphKey, 'model_type'],
                    'model_has_roles_role_model_type_primary');
            }
        });

        Schema::create($roleHasPermissionsTable, static function (Blueprint $table) use ($permissionsTable, $rolesTable, $pivotRole, $pivotPermission): void {
            $table->unsignedBigInteger($pivotPermission);
            $table->unsignedBigInteger($pivotRole);

            $table->foreign($pivotPermission)
                ->references('id') // permission id
                ->on($permissionsTable)
                ->cascadeOnDelete();

            $table->foreign($pivotRole)
                ->references('id') // role id
                ->on($rolesTable)
                ->cascadeOnDelete();

            $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
        });

        $cacheStore = config('permission.cache.store');

        resolve(Factory::class)
            ->store(is_string($cacheStore) && $cacheStore !== 'default' ? $cacheStore : null)
            ->forget(config()->string('permission.cache.key'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $roleHasPermissionsTable = config()->string('permission.table_names.role_has_permissions');
        $modelHasRolesTable = config()->string('permission.table_names.model_has_roles');
        $modelHasPermissionsTable = config()->string('permission.table_names.model_has_permissions');
        $rolesTable = config()->string('permission.table_names.roles');
        $permissionsTable = config()->string('permission.table_names.permissions');

        throw_if($roleHasPermissionsTable === '' || $permissionsTable === '', 'Error: config/permission.php not found and defaults could not be merged. Please publish the package configuration before proceeding, or drop the tables manually.');

        Schema::dropIfExists($roleHasPermissionsTable);
        Schema::dropIfExists($modelHasRolesTable);
        Schema::dropIfExists($modelHasPermissionsTable);
        Schema::dropIfExists($rolesTable);
        Schema::dropIfExists($permissionsTable);
    }
};
