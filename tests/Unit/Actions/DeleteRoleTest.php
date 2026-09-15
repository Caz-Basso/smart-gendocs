<?php

declare(strict_types=1);

use App\Actions\CreateRole;
use App\Actions\DeleteRole;
use App\Actions\SyncPermissionsFromPolicies;
use Spatie\Permission\Models\Role;

it('deletes a role', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $role = resolve(CreateRole::class)->handle('editor', []);

    resolve(DeleteRole::class)->handle($role);

    expect(Role::query()->where('name', 'editor')->exists())->toBeFalse();
});
