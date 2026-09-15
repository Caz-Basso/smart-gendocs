<?php

declare(strict_types=1);

use App\Checkpoint\Checks\FakeNotCheck;
use App\Models\User;
use Checkpoint\Checks\AbstractCheck;
use Checkpoint\Checks\CheckResult;
use Checkpoint\Scanner;

it('exposes registered checks and filters them by name', function (): void {
    $scanner = (new Scanner)
        ->add(fakeCheckpointCheck('Alpha', CheckResult::pass('a')))
        ->add(fakeCheckpointCheck('Beta', CheckResult::pass('b')));

    expect(array_map(fn (AbstractCheck $check): string => $check->name(), $scanner->checks()))
        ->toBe(['Alpha', 'Beta']);

    $scanner->only(['beta']);

    expect(array_map(fn (AbstractCheck $check): string => $check->name(), $scanner->checks()))
        ->toBe(['Beta'])
        ->and(array_keys($scanner->run()))->toBe(['Beta']);
});

it('drops checks listed in except', function (): void {
    $scanner = (new Scanner)
        ->add(fakeCheckpointCheck('Alpha', CheckResult::pass('a')))
        ->add(fakeCheckpointCheck('Beta', CheckResult::pass('b')))
        ->except(['Alpha']);

    expect(array_keys($scanner->run()))->toBe(['Beta']);
});

it('invokes the before-each callback when running checks', function (): void {
    $seen = [];

    (new Scanner)
        ->add(fakeCheckpointCheck('Alpha', CheckResult::pass('a')))
        ->add(fakeCheckpointCheck('Beta', CheckResult::pass('b')))
        ->run(function (AbstractCheck $check) use (&$seen): void {
            $seen[] = $check->name();
        });

    expect($seen)->toBe(['Alpha', 'Beta']);
});

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

function fakeCheckpointCheck(string $name, CheckResult $result): AbstractCheck
{
    return new class($name, $result) extends AbstractCheck
    {
        public function __construct(private readonly string $checkName, private readonly CheckResult $checkResult) {}

        public function name(): string
        {
            return $this->checkName;
        }

        public function run(): CheckResult
        {
            return $this->checkResult;
        }
    };
}
