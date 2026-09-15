<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\RoleName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use UnexpectedValueException;

final class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->role();

        return $this->user()?->can('update', $role) ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $role = $this->role();

        $nameRules = ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role)];

        if ($role->name === RoleName::SuperAdmin->value) {
            $nameRules[] = Rule::in([RoleName::SuperAdmin->value]);
        }

        return [
            'name' => $nameRules,
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ];
    }

    private function role(): Role
    {
        $role = $this->route('role');

        if (! $role instanceof Role) {
            throw new UnexpectedValueException('A role is required.');
        }

        return $role;
    }
}
