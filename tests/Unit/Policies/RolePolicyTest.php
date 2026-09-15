<?php

declare(strict_types=1);

use App\Actions\CreateRole;
use App\Actions\SyncPermissionsFromPolicies;
use App\Models\User;
use App\Policies\RolePolicy;

it('allows role abilities when the matching permission exists', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $user = userWithPermissions('role.create', 'role.update', 'role.delete', 'role.viewAny', 'role.view');
    $role = resolve(CreateRole::class)->handle('editor', []);
    $policy = new RolePolicy();

    expect($policy->viewAny($user))->toBeTrue()
        ->and($policy->view($user, $role))->toBeTrue()
        ->and($policy->create($user))->toBeTrue()
        ->and($policy->update($user, $role))->toBeTrue()
        ->and($policy->delete($user, $role))->toBeTrue()
        ->and($policy->viewAny(User::factory()->create()))->toBeFalse();
});
