<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class DeleteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        return $user instanceof User && ($this->user()?->can('delete', $user) ?? false);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $authenticated = $this->user();

        if ($user instanceof User && $authenticated instanceof User && $authenticated->is($user)) {
            return [
                'password' => ['required', 'current_password'],
            ];
        }

        return [];
    }
}
