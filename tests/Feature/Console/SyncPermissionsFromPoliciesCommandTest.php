<?php

declare(strict_types=1);

use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Support\PermissionName;
use Illuminate\Support\Facades\Artisan;

it('syncs permissions from policies via artisan', function (): void {
    Artisan::call('permissions:sync-from-policies');

    $output = Artisan::output();

    expect($output)->toContain('Synced')
        ->toContain(PermissionName::fromPolicy(UserPolicy::class, 'viewAny'))
        ->toContain(PermissionName::fromPolicy(RolePolicy::class, 'create'));
});
