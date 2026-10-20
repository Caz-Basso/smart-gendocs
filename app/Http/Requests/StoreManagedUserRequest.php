<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use App\Rules\ValidEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

final class StoreManagedUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User || ! $user->can('create', User::class)) {
            return false;
        }

        if (! $this->filled('role')) {
            return true;
        }

        $roleName = $this->input('role');

        return is_string($roleName)
            && ($roleName === 'user' || $this->canAssignRole($user, $roleName));
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'max:255', 'email', new ValidEmail, Rule::unique(User::class)],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['sometimes', 'required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ];
    }

    private function canAssignRole(User $user, string $roleName): bool
    {
        if (! $user->can('manageRoles', User::class)) {
            return false;
        }

        $role = Role::query()->with('permissions')->where('name', $roleName)->where('guard_name', 'web')->first();

        if (! $role || $role->name === 'super-admin') {
            return false;
        }

        return $user->hasRole('super-admin') || $role->permissions->every(fn ($permission): bool => $user->can($permission->name));
    }
}
