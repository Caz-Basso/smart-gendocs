<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

final readonly class GetPermissionGroups
{
    /**
     * @return list<array{resource: string, permissions: list<array{id: int, name: string, ability: string}>}>
     */
    public function handle(): array
    {
        $groups = [];
        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->groupBy(fn (Permission $permission): string => Str::before($permission->name, '.'));

        foreach ($permissions as $resource => $items) {
            $grouped = [];

            foreach ($items as $permission) {
                $grouped[] = [
                    'id' => (int) $permission->id,
                    'name' => $permission->name,
                    'ability' => Str::after($permission->name, '.'),
                ];
            }

            $groups[] = [
                'resource' => (string) $resource,
                'permissions' => $grouped,
            ];
        }

        return $groups;
    }
}
