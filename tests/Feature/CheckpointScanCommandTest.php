<?php

declare(strict_types=1);

use App\Checkpoint\Checks\BunAuditCheck;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Process;

it('runs bun checks instead of npm checks', function (): void {
    Process::fake([
        'composer audit*' => Process::result(output: '{"advisories":[]}', exitCode: 0),
        'bun audit*' => Process::result(output: '{}', exitCode: 0),
        'bun --version' => Process::result(output: "1.3.14\n", exitCode: 0),
        '*' => Process::result(output: '', exitCode: 0),
    ]);

    Artisan::call('checkpoint:scan', ['--only' => 'Bun CVE Audit,Bun Supply Chain,NPM CVE Audit,Supply Chain Tooling']);

    $output = Artisan::output();

    expect($output)
        ->toContain('Bun CVE Audit')
        ->toContain('Bun Supply Chain')
        ->not->toContain('NPM CVE Audit')
        ->not->toContain('Supply Chain Tooling');
});

it('passes package freshness for reviewed recent composer updates', function (): void {
    $exitCode = Artisan::call('checkpoint:scan', [
        '--only' => 'Package Freshness (Supply Chain)',
        '--json' => true,
    ]);

    expect($exitCode)->toBe(0)
        ->and(Artisan::output())->toContain('Package Freshness (Supply Chain)');
});

it('skips custom checks disabled in config', function (): void {
    config([
        'checkpoint.checks' => array_merge(
            config('checkpoint.checks'),
            [BunAuditCheck::class => false],
        ),
    ]);

    Process::fake([
        'bun audit*' => Process::result(output: '{}', exitCode: 0),
        'bun --version' => Process::result(output: "1.3.14\n", exitCode: 0),
        '*' => Process::result(output: '', exitCode: 0),
    ]);

    Artisan::call('checkpoint:scan', ['--only' => 'Bun CVE Audit,Bun Supply Chain']);

    expect(Artisan::output())
        ->not->toContain('Bun CVE Audit')
        ->toContain('Bun Supply Chain');
});
