<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final readonly class UpdateRole
{
    /**
     * @param  list<string>  $permissions
     */
    public function handle(Role $role, string $name, array $permissions): Role
    {
        return DB::transaction(function () use ($role, $name, $permissions): Role {
            $role->update([
                'name' => $name,
            ]);

            $role->syncPermissions($permissions);

            return $role;
        });
    }
}
