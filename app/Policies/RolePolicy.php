<?php

declare(strict_types=1);

namespace App\Policies;

use App\Concerns\ChecksGeneratedPermission;
use App\Models\User;
use Spatie\Permission\Models\Role;

final class RolePolicy
{
    use ChecksGeneratedPermission;

    public function viewAny(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function view(User $user, Role $role): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function create(User $user): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function update(User $user, Role $role): bool
    {
        return $this->allows($user, __FUNCTION__);
    }

    public function delete(User $user, Role $role): bool
    {
        return $this->allows($user, __FUNCTION__);
    }
}
