<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateUser;
use App\Actions\DeleteUser;
use App\Actions\UpdateUser;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\DeleteUserRequest;
use App\Http\Requests\StoreManagedUserRequest;
use App\Http\Requests\UpdateManagedUserRequest;
use App\Models\User;
use App\Support\ListQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

final readonly class UserController
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $authenticatedUser = $request->user();

        $usersQuery = User::query()
            ->with('roles:id,name')
            ->select(['id', 'name', 'email', 'is_active', 'created_at'])
            ->latest();

        ListQuery::search(
            $usersQuery,
            $request->string('search')->toString(),
            ['name', 'email'],
            null,
        );

        return Inertia::render('user/index', [
            'users' => $usersQuery
                ->paginate(ListQuery::perPage($request))
                ->withQueryString(),
            'assignableRoles' => $this->assignableRoles($authenticatedUser instanceof User ? $authenticatedUser : null),
        ]);
    }

    public function createManaged(): Response
    {
        Gate::authorize('create', User::class);

        /** @var User $user */
        $user = Auth::user();

        return Inertia::render('user/admin-create', [
            'assignableRoles' => $this->assignableRoles($user),
            'canManageRoles' => $user->can('manageRoles', User::class),
        ]);
    }

    public function storeManaged(StoreManagedUserRequest $request, CreateUser $action): RedirectResponse
    {
        /** @var array<string, mixed> $attributes */
        $attributes = $request->safe()->except(['password', 'role']);

        $action->handle(
            $attributes,
            $request->string('password')->value(),
            $request->filled('role') ? $request->string('role')->value() : null,
        );

        Inertia::flash('success', 'Usuário criado com sucesso.');

        return to_route('users.index');
    }

    public function create(): Response
    {
        return Inertia::render('user/create');
    }

    public function store(CreateUserRequest $request, CreateUser $action): RedirectResponse
    {
        /** @var array<string, mixed> $attributes */
        $attributes = $request->safe()->except('password');

        $user = $action->handle(
            $attributes,
            $request->string('password')->value(),
        );

        Auth::login($user);

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function update(UpdateManagedUserRequest $request, User $user, UpdateUser $action): RedirectResponse
    {
        $action->handle($user, $request->validated());

        Inertia::flash('success', 'User updated successfully');

        return back();
    }

    public function destroy(DeleteUserRequest $request, User $user, DeleteUser $action): RedirectResponse
    {
        $isSelf = $request->user()?->is($user) ?? false;

        $action->handle($user);

        if ($isSelf) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return to_route('home');
        }

        return to_route('users.index');
    }

    /**
     * @return list<array{name: string, label: string}>
     */
    private function assignableRoles(?User $user): array
    {
        if (! $user instanceof User || ! $user->can('manageRoles', User::class)) {
            return [];
        }

        return Role::query()
            ->with('permissions')
            ->where('guard_name', 'web')
            ->where('name', '!=', 'super-admin')
            ->get()
            ->filter(fn (Role $role): bool => $user->hasRole('super-admin') || $role->permissions->every(fn ($permission): bool => $user->can($permission->name)))
            ->map(fn (Role $role): array => ['name' => $role->name, 'label' => str($role->name)->replace('-', ' ')->title()->value()])
            ->values()
            ->all();
    }
}
