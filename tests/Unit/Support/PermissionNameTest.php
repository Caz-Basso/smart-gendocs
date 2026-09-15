<?php

declare(strict_types=1);

use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Support\PermissionName;

it('builds a permission name from a policy class and ability', function (): void {
    expect(PermissionName::fromPolicy(UserPolicy::class, 'viewAny'))->toBe('user.viewAny')
        ->and(PermissionName::fromPolicy(RolePolicy::class, 'create'))->toBe('role.create');
});
