<?php

declare(strict_types=1);

use App\Actions\CreateRole;
use App\Actions\SyncPermissionsFromPolicies;
use App\Actions\UpdateRole;

it('updates a role name and permissions', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $role = resolve(CreateRole::class)->handle('editor', ['role.viewAny']);

    $updated = resolve(UpdateRole::class)->handle($role, 'publisher', ['user.viewAny', 'user.update']);

    expect($updated->name)->toBe('publisher')
        ->and($updated->permissions->pluck('name')->all())->toEqualCanonicalizing(['user.viewAny', 'user.update']);
});
