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

        $role = Role::findOrCreate(RoleName::SuperAdmin->value, 'web');
        $role->syncPermissions(Permission::query()->get());

        $admin = User::factory()->withoutTwoFactor()->create([
            'name' => 'Admin',
            'email' => 'admin@unesc.net',
            'password' => Hash::make('password'),
        ]);

        $admin->assignRole($role);
    }
}
