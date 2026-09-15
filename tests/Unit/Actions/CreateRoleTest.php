<?php

declare(strict_types=1);

use App\Actions\CreateRole;
use App\Actions\SyncPermissionsFromPolicies;
use Spatie\Permission\Models\Role;

it('creates a role with the given permissions', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $role = resolve(CreateRole::class)->handle('editor', ['role.viewAny', 'user.viewAny']);

    expect($role)->toBeInstanceOf(Role::class)
        ->and($role->name)->toBe('editor')
        ->and($role->permissions->pluck('name')->all())->toEqualCanonicalizing(['role.viewAny', 'user.viewAny']);
});
