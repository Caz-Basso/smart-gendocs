<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Actions\SyncPermissionsFromPolicies;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

final class AdminSeeder extends Seeder
{
    public function run(): void
    {
        resolve(SyncPermissionsFromPolicies::class)->handle();

        $adminRole = Role::where('name', 'admin')->first();

        if (! $adminRole) {
            $this->command->warn('Role admin não encontrado. Execute as permissões primeiro.');

            return;
        }

        $adminRole->givePermissionTo([
            'user.viewAny',
            'user.create',
            'user.update',
            'user.delete',
            'user.manageRoles',
            'user.changeStatus',
            'user.impersonate',
            'user.viewAudits',
        ]);

        $admin = User::updateOrCreate(
            ['email' => 'admin@smartgendocs.com'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('admin123'),
                'email_verified_at' => now(),
            ]
        );

        $admin->assignRole($adminRole);

        $this->command->info('Usuário admin criado: admin@smartgendocs.com / admin123');
    }
}
