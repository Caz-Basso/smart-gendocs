<?php

declare(strict_types=1);

use App\Actions\GetPermissionGroups;
use App\Actions\SyncPermissionsFromPolicies;

it('groups permissions by resource', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $groups = resolve(GetPermissionGroups::class)->handle();
    $resources = collect($groups)->pluck('resource')->all();
    $roleGroup = collect($groups)->firstWhere('resource', 'role');

    expect($groups)->not->toBeEmpty()
        ->and($resources)->toContain('user', 'role')
        ->and($roleGroup)->not->toBeNull()
        ->and(collect($roleGroup['permissions'])->pluck('name')->all())->each->toStartWith('role.');
});
