<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Actions\SyncPermissionsFromPolicies;
use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        resolve(SyncPermissionsFromPolicies::class)->handle();

        // Criar role SuperAdmin
        $superAdminRole = Role::findOrCreate(RoleName::SuperAdmin->value, 'web');
        $superAdminRole->syncPermissions(Permission::query()->get());

        // Criar role Admin
        Role::findOrCreate(RoleName::Admin->value, 'web');

        // Criar role User
        Role::findOrCreate(RoleName::User->value, 'web');

        // Criar usuário SuperAdmin
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@unesc.net'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
            ]
        );
        $superAdmin->assignRole($superAdminRole);

        // Criar usuário Admin padrão
        $admin = User::updateOrCreate(
            ['email' => 'admin@smartgendocs.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('admin123'),
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole(Role::findOrCreate(RoleName::Admin->value, 'web'));
    }
}
