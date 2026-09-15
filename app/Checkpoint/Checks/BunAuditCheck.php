<?php

declare(strict_types=1);

namespace App\Checkpoint\Checks;

use Checkpoint\Checks\AbstractCheck;
use Checkpoint\Checks\CheckResult;
use Illuminate\Support\Facades\Process;

final class BunAuditCheck extends AbstractCheck
{
    public function __construct(
        private readonly string $basePath,
        private readonly string $bunBinary = 'bun',
    ) {}

    public function name(): string
    {
        return 'Bun CVE Audit';
    }

    public function run(): CheckResult
    {
        if (! file_exists($this->basePath.'/package.json')) {
            return CheckResult::warn('package.json not found — skipping Bun audit.');
        }

        if (! file_exists($this->basePath.'/bun.lock')) {
            return CheckResult::warn('bun.lock not found — run `bun install` and commit the lockfile before auditing.');
        }

        $process = Process::path($this->basePath)
            ->timeout(120)
            ->run([$this->bunBinary, 'audit', '--json']);

        if (! $process->successful() && mb_trim($process->output()) === '') {
            return CheckResult::warn(
                'Unable to run `bun audit` — ensure Bun is installed and on PATH.',
                [mb_trim($process->errorOutput()) ?: 'Process exited with code '.$process->exitCode()],
            );
        }

        $output = mb_trim($process->output());
        $decoded = $output !== '' ? @json_decode($output, true) : null;

        if (! is_array($decoded)) {
            return CheckResult::warn('`bun audit --json` returned invalid JSON — skipping Bun audit.');
        }

        /** @var array<string, mixed> $auditResults */
        $auditResults = $decoded;

        if ($auditResults === []) {
            return CheckResult::pass('No known CVEs in Bun dependencies.');
        }

        [$critical, $high, $details] = $this->parseVulnerabilities($auditResults);

        if ($critical > 0) {
            return CheckResult::fail($critical.' critical vulnerability/ies in Bun dependencies.', $details);
        }

        if ($high > 0) {
            return CheckResult::warn($high.' high-severity vulnerability/ies in Bun dependencies.', $details);
        }

        $total = count($details);

        if ($total > 0) {
            return CheckResult::warn($total.' low/medium vulnerability/ies in Bun dependencies (run `bun audit` for details).', $details);
        }

        return CheckResult::pass('No known CVEs in Bun dependencies.');
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @return array{0: int, 1: int, 2: list<string>}
     */
    private function parseVulnerabilities(array $decoded): array
    {
        $critical = 0;
        $high = 0;
        $details = [];

        $entries = $decoded['vulnerabilities'] ?? $decoded;

        if (! is_array($entries)) {
            return [0, 0, []];
        }

        foreach ($entries as $name => $vuln) {
            if (! is_array($vuln)) {
                continue;
            }

            $severityValue = $vuln['severity'] ?? 'unknown';
            $severity = mb_strtolower(is_string($severityValue) ? $severityValue : 'unknown');

            if ($severity === 'critical') {
                $critical++;
            }

            if ($severity === 'high') {
                $high++;
            }

            if (! in_array($severity, ['critical', 'high', 'moderate', 'low'], true)) {
                continue;
            }

            $titleValue = $vuln['title'] ?? $vuln['name'] ?? $name;
            $packageName = is_string($name) ? $name : (string) $name;
            $title = is_string($titleValue) ? $titleValue : $packageName;
            $details[] = sprintf('[%s] %s: %s', $severity, $packageName, $title);
        }

        return [$critical, $high, $details];
    }
}
