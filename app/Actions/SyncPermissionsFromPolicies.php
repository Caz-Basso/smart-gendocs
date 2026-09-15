<?php

declare(strict_types=1);

namespace App\Actions;

use App\Support\PermissionName;
use Illuminate\Support\Facades\File;
use ReflectionClass;
use ReflectionMethod;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use SplFileInfo;

final readonly class SyncPermissionsFromPolicies
{
    /**
     * @return list<string>
     */
    public function handle(): array
    {
        $names = $this->permissionNames();

        if ($names === []) {
            return [];
        }

        foreach ($names as $name) {
            Permission::findOrCreate($name, 'web');
        }

        Permission::query()
            ->where('guard_name', 'web')
            ->whereNotIn('name', $names)
            ->delete();

        resolve(PermissionRegistrar::class)->forgetCachedPermissions();

        return $names;
    }

    /**
     * @return list<string>
     */
    private function permissionNames(): array
    {
        $names = [];

        foreach (File::files(app_path('Policies')) as $file) {
            $class = $this->policyClass($file);

            if ($class === null) {
                continue;
            }

            $reflection = new ReflectionClass($class);

            if ($reflection->isAbstract()) {
                continue;
            }

            foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
                if ($method->class !== $class || $method->isConstructor() || $method->name === 'before') {
                    continue;
                }

                $names[] = PermissionName::fromPolicy($class, $method->name);
            }
        }

        $names = array_values(array_unique($names));
        sort($names);

        return $names;
    }

    /**
     * @return class-string|null
     */
    private function policyClass(SplFileInfo $file): ?string
    {
        $class = 'App\\Policies\\'.$file->getBasename('.php');

        if (! class_exists($class)) {
            return null;
        }

        return $class;
    }
}
