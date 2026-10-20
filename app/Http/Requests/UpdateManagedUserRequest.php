<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use App\Rules\ValidEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

final class UpdateManagedUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $actor = $this->user();
        $target = $this->route('user');

        if (! $actor instanceof User || ! $target instanceof User || ! $actor->can('update', $target)) {
            return false;
        }

        if ($this->has('role')) {
            $roleName = $this->input('role');

            if (! is_string($roleName) || ! $this->canAssignRole($actor, $roleName)) {
                return false;
            }

            if ($target->hasRole('super-admin') && ! $actor->hasRole('super-admin')) {
                return false;
            }
        }

        if ($this->has('is_active')) {
            if ($actor->is($target) || ! $actor->can('changeStatus', $target)) {
                return false;
            }

            if ($target->hasRole('super-admin') && ! $actor->hasRole('super-admin')) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        $target = $this->route('user');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'lowercase', 'max:255', 'email', new ValidEmail, Rule::unique(User::class)->ignore($target instanceof User ? $target->id : null)],
            'role' => ['sometimes', 'required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'is_active' => ['sometimes', 'required', 'boolean'],
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
