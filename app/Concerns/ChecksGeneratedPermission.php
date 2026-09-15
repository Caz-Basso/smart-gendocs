<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Models\User;
use App\Support\PermissionName;

trait ChecksGeneratedPermission
{
    protected function allows(User $user, string $ability): bool
    {
        return $user->checkPermissionTo(PermissionName::fromPolicy(static::class, $ability));
    }
}
