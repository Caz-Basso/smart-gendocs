<?php

declare(strict_types=1);

namespace App\Policies;

use App\Concerns\ChecksGeneratedPermission;
use App\Models\User;

final class RolePolicy
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

    public function create(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function update(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function delete(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }
}
