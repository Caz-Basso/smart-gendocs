<?php

declare(strict_types=1);

use App\Checkpoint\Checks\BunAuditCheck;
use Checkpoint\Checks\CheckResult;
use Illuminate\Support\Facades\Process;

it('warns when package.json is missing', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);

    $result = new BunAuditCheck($basePath)->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('package.json');

    rmdir($basePath);
});

it('warns when bun.lock is missing', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');

    $result = new BunAuditCheck($basePath)->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('bun.lock');

    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('passes when bun audit reports no vulnerabilities', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(output: '{}', exitCode: 0),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->message)->toContain('No known CVEs');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('fails when bun audit reports critical vulnerabilities', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(
            output: json_encode([
                'vulnerabilities' => [
                    'lodash' => [
                        'severity' => 'critical',
                        'title' => 'Prototype Pollution',
                    ],
                ],
            ], JSON_THROW_ON_ERROR),
            exitCode: 1,
        ),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::FAIL)
        ->and($result->details)->toContain('[critical] lodash: Prototype Pollution');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('warns when bun audit cannot be executed', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(output: '', errorOutput: '', exitCode: 127),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('Unable to run `bun audit`')
        ->and($result->details[0])->toBe('Process exited with code 127');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('warns when bun audit returns invalid json', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(output: 'not-json', exitCode: 0),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('invalid JSON');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('warns when bun audit reports high severity vulnerabilities', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(
            output: json_encode([
                'vulnerabilities' => [
                    'axios' => [
                        'severity' => 'high',
                        'title' => 'SSRF',
                    ],
                ],
            ], JSON_THROW_ON_ERROR),
            exitCode: 0,
        ),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('high-severity')
        ->and($result->details)->toContain('[high] axios: SSRF');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('warns when bun audit reports low or moderate vulnerabilities', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(
            output: json_encode([
                'vulnerabilities' => [
                    'pkg' => [
                        'severity' => 'moderate',
                        'name' => 'Moderate Issue',
                    ],
                ],
            ], JSON_THROW_ON_ERROR),
            exitCode: 0,
        ),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::WARN)
        ->and($result->message)->toContain('low/medium')
        ->and($result->details)->toContain('[moderate] pkg: Moderate Issue');

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('passes when vulnerability entries are not an array', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(
            output: json_encode(['vulnerabilities' => 'not-an-array'], JSON_THROW_ON_ERROR),
            exitCode: 0,
        ),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->details)->toBeEmpty();

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});

it('passes when bun audit reports only unknown severities', function (): void {
    $basePath = sys_get_temp_dir().'/checkpoint-bun-audit-'.uniqid();

    mkdir($basePath, 0755, true);
    file_put_contents($basePath.'/package.json', '{}');
    file_put_contents($basePath.'/bun.lock', '');

    Process::fake([
        '*' => Process::result(
            output: json_encode([
                'vulnerabilities' => [
                    'ignored-entry' => 'not-an-array',
                    'unknown-pkg' => ['severity' => 'info'],
                ],
                'not-vulnerabilities' => 'invalid',
            ], JSON_THROW_ON_ERROR),
            exitCode: 0,
        ),
    ]);

    $result = new BunAuditCheck($basePath, 'bun')->run();

    expect($result->status)->toBe(CheckResult::PASS)
        ->and($result->details)->toBeEmpty();

    unlink($basePath.'/bun.lock');
    unlink($basePath.'/package.json');
    rmdir($basePath);
});
