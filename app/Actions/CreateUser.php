<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use SensitiveParameter;
use Spatie\Permission\Models\Role;

final readonly class CreateUser
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(array $attributes, #[SensitiveParameter] string $password, ?string $roleName = null): User
    {
        return DB::transaction(function () use ($attributes, $password, $roleName): User {
            $user = User::query()->create([
                ...$attributes,
                'password' => $password,
            ]);

            // Atribuir role padrão "user" para novos registros
            $userRole = Role::where('name', $roleName ?? RoleName::User->value)->first();
            if ($userRole) {
                $user->assignRole($userRole);
            }

            event(new Registered($user));

            return $user;
        });
    }
}
