<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

final readonly class CreateRole
{
    /**
     * @param  list<string>  $permissions
     */
    public function handle(string $name, array $permissions): Role
    {
        return DB::transaction(function () use ($name, $permissions): Role {
            $role = Role::query()->create([
                'name' => $name,
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($permissions);

            return $role;
        });
    }
}
