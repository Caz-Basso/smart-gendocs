<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Lab404\Impersonate\Services\ImpersonateManager;

final class ImpersonateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $target = $this->route('user');
        $impersonator = $this->user();

        return $target instanceof User
            && $impersonator instanceof User
            && $impersonator->getKey() !== $target->getKey()
            && $impersonator->canImpersonate()
            && $target->canBeImpersonated()
            && !app(ImpersonateManager::class)->isImpersonating();
    }

    /**
     * @return array{}
     */
    public function rules(): array
    {
        return [];
    }
}
