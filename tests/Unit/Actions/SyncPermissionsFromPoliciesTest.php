<?php

declare(strict_types=1);

use App\Actions\SyncPermissionsFromPolicies;
use Spatie\Permission\Models\Permission;

it('creates permissions from policy methods', function (): void {
    $names = resolve(SyncPermissionsFromPolicies::class)->handle();

    expect($names)->toContain(
        'user.viewAny',
        'user.view',
        'user.update',
        'user.delete',
        'user.impersonate',
        'user.viewAudits',
        'role.viewAny',
        'role.view',
        'role.create',
        'role.update',
        'role.delete',
    )->and(Permission::query()->pluck('name')->all())->toEqual($names);
});

it('removes permissions that no longer exist on policies', function (): void {
    Permission::findOrCreate('legacy.custom', 'web');

    resolve(SyncPermissionsFromPolicies::class)->handle();

    expect(Permission::query()->where('name', 'legacy.custom')->exists())->toBeFalse();
});
