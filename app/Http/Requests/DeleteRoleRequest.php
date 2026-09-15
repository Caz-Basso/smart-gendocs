<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\RoleName;
use Illuminate\Foundation\Http\FormRequest;
use Spatie\Permission\Models\Role;

final class DeleteRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->route('role');

        return $role instanceof Role
            && $role->name !== RoleName::SuperAdmin->value
            && ($this->user()?->can('delete', $role) ?? false);
    }

    /**
     * @return array{}
     */
    public function rules(): array
    {
        return [];
    }
}
