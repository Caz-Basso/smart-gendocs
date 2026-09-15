<?php

declare(strict_types=1);

namespace App\Actions;

use Spatie\Permission\Models\Role;

final readonly class DeleteRole
{
    public function handle(Role $role): void
    {
        $role->delete();
    }
}
