<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\SyncPermissionsFromPolicies;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('permissions:sync-from-policies')]
#[Description('Create Spatie permissions from application policy methods')]
final class SyncPermissionsFromPoliciesCommand extends Command
{
    public function handle(SyncPermissionsFromPolicies $sync): int
    {
        $names = $sync->handle();

        $this->info(sprintf('Synced %d permissions from policies.', count($names)));

        foreach ($names as $name) {
            $this->line(' - '.$name);
        }

        return self::SUCCESS;
    }
}
