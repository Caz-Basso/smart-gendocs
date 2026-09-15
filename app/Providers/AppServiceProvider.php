<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\RoleName;
use App\Models\User;
use App\Policies\RolePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Role;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Role::class, RolePolicy::class);

        Gate::before(function (?User $user): ?bool {
            if (! $user instanceof User) {
                return null;
            }

            return $user->hasRole(RoleName::SuperAdmin->value) ? true : null;
        });
    }
}
