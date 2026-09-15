<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateRole;
use App\Actions\DeleteRole;
use App\Actions\GetPermissionGroups;
use App\Actions\SyncPermissionsFromPolicies;
use App\Actions\UpdateRole;
use App\Enums\RoleName;
use App\Http\Requests\CreateRoleRequest;
use App\Http\Requests\DeleteRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

final readonly class RoleController
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Role::class);

        return Inertia::render('role/index', [
            'roles' => Role::query()
                ->with('permissions')
                ->latest()
                ->get()
                ->map(fn (Role $role): array => $this->rolePayload($role)),
        ]);
    }

    public function create(SyncPermissionsFromPolicies $sync, GetPermissionGroups $groups): Response
    {
        Gate::authorize('create', Role::class);

        $sync->handle();

        return Inertia::render('role/create', [
            'permissionGroups' => $groups->handle(),
        ]);
    }

    public function store(CreateRoleRequest $request, CreateRole $action): RedirectResponse
    {
        /** @var list<string> $permissions */
        $permissions = $request->validated('permissions');

        $action->handle($request->string('name')->value(), $permissions);

        Inertia::flash('success', 'Role created successfully');

        return to_route('roles.index');
    }

    public function edit(Role $role, SyncPermissionsFromPolicies $sync, GetPermissionGroups $groups): Response
    {
        Gate::authorize('update', $role);

        $sync->handle();

        $role->load('permissions');

        return Inertia::render('role/edit', [
            'role' => $this->rolePayload($role),
            'permissionGroups' => $groups->handle(),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateRole $action): RedirectResponse
    {
        /** @var list<string> $permissions */
        $permissions = $request->validated('permissions');

        $action->handle($role, $request->string('name')->value(), $permissions);

        Inertia::flash('success', 'Role updated successfully');

        return to_route('roles.index');
    }

    public function destroy(DeleteRoleRequest $request, Role $role, DeleteRole $action): RedirectResponse
    {
        $request->validated();

        $action->handle($role);

        Inertia::flash('success', 'Role deleted successfully');

        return to_route('roles.index');
    }

    /**
     * @return array{id: int, name: string, is_protected: bool, permissions: list<string>}
     */
    private function rolePayload(Role $role): array
    {
        /** @var list<string> $permissions */
        $permissions = $role->permissions->pluck('name')->values()->all();

        return [
            'id' => (int) $role->id,
            'name' => $role->name,
            'is_protected' => $role->name === RoleName::SuperAdmin->value,
            'permissions' => $permissions,
        ];
    }
}
