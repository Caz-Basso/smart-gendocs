<?php

declare(strict_types=1);

namespace App\Checkpoint\Checks;

use Checkpoint\Checks\AbstractCheck;
use Checkpoint\Checks\CheckResult;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\ExecutableFinder;

final class BunSupplyChainCheck extends AbstractCheck
{
    public function __construct(
        private readonly string $basePath,
        private readonly string $bunBinary = 'bun',
    ) {}

    public function name(): string
    {
        return 'Bun Supply Chain';
    }

    public function run(): CheckResult
    {
        if (! file_exists($this->basePath.'/package.json')) {
            return CheckResult::pass('No package.json found — Bun supply-chain checks not applicable.');
        }

        $details = [];
        $warnings = [];

        $bunPath = (new ExecutableFinder)->find($this->bunBinary);

        if ($bunPath === null) {
            $warnings[] = 'Bun is not on PATH — install Bun to manage frontend dependencies reproducibly.';
        } else {
            $version = $this->resolveBunVersion($bunPath);
            $details[] = $version !== null
                ? sprintf('bun %s available at %s', $version, $bunPath)
                : 'bun available at '.$bunPath;
        }

        if (! file_exists($this->basePath.'/bun.lock')) {
            $warnings[] = 'bun.lock is missing — commit a frozen lockfile so CI and production install the same dependency tree.';
        } else {
            $details[] = 'bun.lock present — installs are reproducible across environments.';
        }

        if ($warnings !== []) {
            return CheckResult::warn(
                count($warnings).' Bun supply-chain issue(s) found.',
                [...$warnings, ...$details],
            );
        }

        return CheckResult::pass('Bun supply-chain baseline looks healthy.', $details);
    }

    private function resolveBunVersion(string $bunPath): ?string
    {
        $process = Process::path($this->basePath)
            ->timeout(10)
            ->run([$bunPath, '--version']);

        if (! $process->successful()) {
            return null;
        }

        $version = mb_trim($process->output());

        return $version !== '' ? $version : null;
    }
}
