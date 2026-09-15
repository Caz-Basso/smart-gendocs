<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

final class PermissionName
{
    public static function fromPolicy(string $policyClass, string $ability): string
    {
        $resource = Str::of(class_basename($policyClass))
            ->beforeLast('Policy')
            ->kebab()
            ->value();

        return $resource.'.'.$ability;
    }
}
