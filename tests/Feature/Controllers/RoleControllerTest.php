<?php

declare(strict_types=1);

use App\Actions\CreateRole;
use App\Actions\SyncPermissionsFromPolicies;
use App\Enums\RoleName;
use App\Models\User;
use Spatie\Permission\Models\Role;

it('renders the roles index for authorized users', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();
    $role = resolve(CreateRole::class)->handle('editor', ['user.viewAny']);

    $response = $this->actingAs(userWithPermissions('role.viewAny'))
        ->get(route('roles.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('role/index')
            ->has('roles', 1)
            ->where('roles.0.name', 'editor')
            ->where('roles.0.permissions', ['user.viewAny'])
            ->where('roles.0.is_protected', false)
        );

    expect($role->name)->toBe('editor');
});

it('forbids the roles index without permission', function (): void {
    $response = $this->actingAs(User::factory()->create())
        ->get(route('roles.index'));

    $response->assertForbidden();
});

it('requires authentication to view roles', function (): void {
    $response = $this->get(route('roles.index'));

    $response->assertRedirectToRoute('login');
});

it('renders the create role page with policy permission groups', function (): void {
    $response = $this->actingAs(userWithPermissions('role.create'))
        ->get(route('roles.create'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('role/create')
            ->has('permissionGroups')
        );
});

it('creates a role from selected permissions', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();

    $response = $this->actingAs(userWithPermissions('role.create'))
        ->fromRoute('roles.create')
        ->post(route('roles.store'), [
            'name' => 'editor',
            'permissions' => ['user.viewAny', 'role.viewAny'],
        ]);

    $response->assertRedirectToRoute('roles.index')
        ->assertInertiaFlash('success', 'Role created successfully');

    $role = Role::query()->where('name', 'editor')->first();

    expect($role)->not->toBeNull()
        ->and($role->permissions->pluck('name')->all())->toEqualCanonicalizing(['user.viewAny', 'role.viewAny']);
});

it('requires a unique role name', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();
    resolve(CreateRole::class)->handle('editor', []);

    $response = $this->actingAs(userWithPermissions('role.create'))
        ->fromRoute('roles.create')
        ->post(route('roles.store'), [
            'name' => 'editor',
            'permissions' => [],
        ]);

    $response->assertRedirectToRoute('roles.create')
        ->assertSessionHasErrors('name');
});

it('renders the edit role page', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();
    $role = resolve(CreateRole::class)->handle('editor', ['user.viewAny']);

    $response = $this->actingAs(userWithPermissions('role.update'))
        ->get(route('roles.edit', $role));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('role/edit')
            ->where('role.name', 'editor')
            ->where('role.permissions', ['user.viewAny'])
            ->has('permissionGroups')
        );
});

it('updates a role', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();
    $role = resolve(CreateRole::class)->handle('editor', ['user.viewAny']);

    $response = $this->actingAs(userWithPermissions('role.update'))
        ->fromRoute('roles.edit', $role)
        ->put(route('roles.update', $role), [
            'name' => 'publisher',
            'permissions' => ['user.update'],
        ]);

    $response->assertRedirectToRoute('roles.index')
        ->assertInertiaFlash('success', 'Role updated successfully');

    expect($role->fresh()->name)->toBe('publisher')
        ->and($role->fresh()->permissions->pluck('name')->all())->toBe(['user.update']);
});

it('does not allow renaming the super admin role', function (): void {
    $role = Role::findOrCreate(RoleName::SuperAdmin->value, 'web');

    $response = $this->actingAs(superAdmin())
        ->fromRoute('roles.edit', $role)
        ->put(route('roles.update', $role), [
            'name' => 'renamed',
            'permissions' => [],
        ]);

    $response->assertRedirectToRoute('roles.edit', $role)
        ->assertSessionHasErrors('name');

    expect($role->fresh()->name)->toBe(RoleName::SuperAdmin->value);
});

it('deletes a role', function (): void {
    resolve(SyncPermissionsFromPolicies::class)->handle();
    $role = resolve(CreateRole::class)->handle('editor', []);

    $response = $this->actingAs(userWithPermissions('role.delete'))
        ->fromRoute('roles.index')
        ->delete(route('roles.destroy', $role));

    $response->assertRedirectToRoute('roles.index')
        ->assertInertiaFlash('success', 'Role deleted successfully');

    expect(Role::query()->whereKey($role->id)->exists())->toBeFalse();
});

it('does not allow deleting the super admin role', function (): void {
    $role = Role::findOrCreate(RoleName::SuperAdmin->value, 'web');

    $response = $this->actingAs(superAdmin())
        ->fromRoute('roles.index')
        ->delete(route('roles.destroy', $role));

    $response->assertForbidden();

    expect(Role::query()->where('name', RoleName::SuperAdmin->value)->exists())->toBeTrue();
});
