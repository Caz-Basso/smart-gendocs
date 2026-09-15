<?php

declare(strict_types=1);

use App\Checkpoint\Checks\FakeNotCheck;
use App\Models\User;
use Checkpoint\Scanner;

it('skips invalid application check registrations from config', function (): void {
    config([
        'checkpoint.checks' => array_merge(
            config('checkpoint.checks'),
            [
                123 => true,
                User::class => true,
                FakeNotCheck::class => true,
            ],
        ),
    ]);

    $scanner = Scanner::withDefaultChecks(base_path());

    expect($scanner->run())->toBeArray();
});

it('normalizes invalid checkpoint config values', function (): void {
    config([
        'checkpoint.package_freshness.minimum_age_days' => 'invalid',
        'checkpoint.package_freshness.whitelist' => 'not-an-array',
        'checkpoint.suspicious_autoload.whitelist' => 'not-an-array',
    ]);

    $scanner = Scanner::withDefaultChecks(base_path());

    expect($scanner->run())->toBeArray();
});
