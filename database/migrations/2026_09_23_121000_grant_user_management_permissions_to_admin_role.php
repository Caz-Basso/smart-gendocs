<?php

declare(strict_types=1);

use App\Enums\RoleName;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * @var list<string>
     */
    private array $permissions = [
        'user.viewAny',
        'user.create',
        'user.update',
        'user.delete',
        'user.manageRoles',
        'user.changeStatus',
        'user.impersonate',
        'user.viewAudits',
    ];

    public function up(): void
    {
        foreach ($this->permissions as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $adminRole = Role::query()
            ->where('name', RoleName::Admin->value)
            ->where('guard_name', 'web')
            ->first();

        $adminRole?->givePermissionTo($this->permissions);
        resolve(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $adminRole = Role::query()
            ->where('name', RoleName::Admin->value)
            ->where('guard_name', 'web')
            ->first();

        $adminRole?->revokePermissionTo($this->permissions);
        resolve(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
