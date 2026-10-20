<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\DocumentModel;
use App\Policies\DocumentModelPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

final class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        DocumentModel::class => DocumentModelPolicy::class,
    ];

    public function boot(): void
    {
        Gate::before(fn ($user, $ability): ?true => $user->hasRole('super-admin') ? true : null);
    }
}
