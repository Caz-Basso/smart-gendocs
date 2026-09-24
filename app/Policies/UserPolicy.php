<?php

declare(strict_types=1);

namespace App\Policies;

use App\Concerns\ChecksGeneratedPermission;
use App\Models\User;

final class UserPolicy
{
    use ChecksGeneratedPermission;

    public function viewAny(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function view(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function update(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function create(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function manageRoles(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function changeStatus(User $user, User $model): bool
    {
        return ! $user->is($model) && $this->allows($user, __FUNCTION__);
    }

    public function delete(User $user, User $model): bool
    {
        if ($model->hasRole('super-admin') && ! $user->hasRole('super-admin')) {
            return false;
        }

        if ($user->is($model)) {
            return true;
        }

        return $this->allows($user, __FUNCTION__);
    }

    public function impersonate(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function viewAudits(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }
}
