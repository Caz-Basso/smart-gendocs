<?php

declare(strict_types=1);

use App\Checkpoint\Checks\BunSupplyChainCheck;
use Checkpoint\Checks\CheckResult;
use Illuminate\Support\Facades\Process;

it('passes when package.json is missing', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-supply-'.uniqid();

    mkdir($basePath, 0755, true);

    $result = new BunSupplyChainCheck($basePath)->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->message)->toContain('not applicable');

    rmdir($basePath);
});

it('warns when bun.lock is missing', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-supply-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');

    Process::fake([
        '*' => Process::result(output: "1.3.14\n", exitCode: 0),
    ]);

    $result = new BunSupplyChainCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and(implode(' ', $result->details))->toContain('bun.lock is missing');

    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('passes when bun and bun.lock are present', function (): void {
    $basePath = base_path();

    Process::fake([
        '*' => Process::result(output: "1.3.14\n", exitCode: 0),
    ]);

    $result = new BunSupplyChainCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->message)->toContain('healthy');
});

it('warns when bun is not on path', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-supply-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    $result = new BunSupplyChainCheck($basePath, 'bun-binary-that-does-not-exist')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->details[0])->toContain('Bun is not on PATH');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('reports bun path when version command fails', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-supply-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(output: '', exitCode: 1),
    ]);

    $result = new BunSupplyChainCheck($basePath, 'false')->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->details)->toHaveCount(2)
        ->and($result->details[0])->toContain('bun available at');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});
