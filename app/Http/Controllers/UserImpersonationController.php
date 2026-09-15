<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ImpersonateUserRequest;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;

final readonly class UserImpersonationController
{
    public function store(ImpersonateUserRequest $request, User $user, #[CurrentUser] User $impersonator): RedirectResponse
    {
        $impersonator->impersonate($user);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function destroy(#[CurrentUser] User $user): RedirectResponse
    {
        $user->leaveImpersonation();

        return to_route('users.index');
    }
}
