<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateUser;
use App\Actions\DeleteUser;
use App\Actions\UpdateUser;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\DeleteUserRequest;
use App\Http\Requests\UpdateUserNameRequest;
use App\Models\User;
use App\Support\ListQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

final readonly class UserController
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $usersQuery = User::query()
            ->select(['id', 'name', 'email', 'created_at'])
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
        ]);
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

    public function update(UpdateUserNameRequest $request, User $user, UpdateUser $action): RedirectResponse
    {
        $action->handle($user, $request->validated());

        return Inertia::flash('success', 'User updated successfully')->back();
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
}
