<?php

declare(strict_types=1);

namespace Checkpoint;

use Checkpoint\Checks\AbstractCheck;
use Checkpoint\Checks\CheckResult;
use Checkpoint\Checks\CommandInjectionCheck;
use Checkpoint\Checks\ComposerAuditCheck;
use Checkpoint\Checks\CorsConfigCheck;
use Checkpoint\Checks\CsrfCheck;
use Checkpoint\Checks\DebugFunctionsCheck;
use Checkpoint\Checks\EnvironmentCheck;
use Checkpoint\Checks\EolVersionCheck;
use Checkpoint\Checks\FilePermissionsCheck;
use Checkpoint\Checks\GitIgnoreCheck;
use Checkpoint\Checks\HardcodedSecretsCheck;
use Checkpoint\Checks\InsecureDeserializationCheck;
use Checkpoint\Checks\InsecureRngCheck;
use Checkpoint\Checks\MassAssignmentCheck;
use Checkpoint\Checks\NpmAuditCheck;
use Checkpoint\Checks\OpenRedirectCheck;
use Checkpoint\Checks\PackageFreshnessCheck;
use Checkpoint\Checks\PathTraversalCheck;
use Checkpoint\Checks\SensitiveExposureCheck;
use Checkpoint\Checks\SessionSecurityCheck;
use Checkpoint\Checks\SqlInjectionCheck;
use Checkpoint\Checks\SsrfCheck;
use Checkpoint\Checks\SupplyChainToolingCheck;
use Checkpoint\Checks\SuspiciousVendorAutoloadCheck;
use Checkpoint\Checks\TlsVerificationCheck;
use Checkpoint\Checks\WeakCryptographyCheck;
use Checkpoint\Checks\XssCheck;

/**
 * Replaces vendor Scanner via composer autoload so `php artisan checkpoint:scan`
 * picks up App\Checkpoint\Checks\* entries from config without a custom command.
 *
 * Sync with vendor/andreapollastri/checkpoint/src/Scanner.php on package upgrades.
 *
 * @see https://github.com/andreapollastri/checkpoint#extending-with-custom-checks
 */
final class Scanner
{
    private const string APPLICATION_CHECK_NAMESPACE = 'App\\Checkpoint\\Checks\\';

    /** @var AbstractCheck[] */
    private array $checks = [];

    public static function withDefaultChecks(string $basePath): static
    {
        $packageFreshnessMinimumAgeDays = config('checkpoint.package_freshness.minimum_age_days', 3);
        $packageFreshnessMinimumAgeDays = is_int($packageFreshnessMinimumAgeDays)
            ? $packageFreshnessMinimumAgeDays
            : 3;

        $packageFreshnessWhitelist = config('checkpoint.package_freshness.whitelist', []);
        $packageFreshnessWhitelist = is_array($packageFreshnessWhitelist)
            ? array_values(array_filter($packageFreshnessWhitelist, is_string(...)))
            : [];

        $suspiciousAutoloadWhitelist = config('checkpoint.suspicious_autoload.whitelist', []);
        $suspiciousAutoloadWhitelist = is_array($suspiciousAutoloadWhitelist)
            ? array_values(array_filter($suspiciousAutoloadWhitelist, is_string(...)))
            : [];

        /** @var array<class-string<AbstractCheck>, callable(): AbstractCheck> */
        $factories = [
            ComposerAuditCheck::class => fn (): AbstractCheck => new ComposerAuditCheck($basePath),
            NpmAuditCheck::class => fn (): AbstractCheck => new NpmAuditCheck($basePath),
            EnvironmentCheck::class => fn (): AbstractCheck => new EnvironmentCheck($basePath),
            GitIgnoreCheck::class => fn (): AbstractCheck => new GitIgnoreCheck($basePath),
            FilePermissionsCheck::class => fn (): AbstractCheck => new FilePermissionsCheck($basePath),
            HardcodedSecretsCheck::class => fn (): AbstractCheck => new HardcodedSecretsCheck($basePath),
            SqlInjectionCheck::class => fn (): AbstractCheck => new SqlInjectionCheck($basePath),
            MassAssignmentCheck::class => fn (): AbstractCheck => new MassAssignmentCheck($basePath),
            XssCheck::class => fn (): AbstractCheck => new XssCheck($basePath),
            CsrfCheck::class => fn (): AbstractCheck => new CsrfCheck($basePath),
            OpenRedirectCheck::class => fn (): AbstractCheck => new OpenRedirectCheck($basePath),
            CommandInjectionCheck::class => fn (): AbstractCheck => new CommandInjectionCheck($basePath),
            InsecureDeserializationCheck::class => fn (): AbstractCheck => new InsecureDeserializationCheck($basePath),
            DebugFunctionsCheck::class => fn (): AbstractCheck => new DebugFunctionsCheck($basePath),
            SensitiveExposureCheck::class => fn (): AbstractCheck => new SensitiveExposureCheck($basePath),
            SsrfCheck::class => fn (): AbstractCheck => new SsrfCheck($basePath),
            TlsVerificationCheck::class => fn (): AbstractCheck => new TlsVerificationCheck($basePath),
            CorsConfigCheck::class => fn (): AbstractCheck => new CorsConfigCheck($basePath),
            PackageFreshnessCheck::class => fn (): AbstractCheck => new PackageFreshnessCheck(
                $basePath,
                $packageFreshnessMinimumAgeDays,
                $packageFreshnessWhitelist,
            ),
            SuspiciousVendorAutoloadCheck::class => fn (): AbstractCheck => new SuspiciousVendorAutoloadCheck(
                $basePath,
                $suspiciousAutoloadWhitelist,
            ),
            SupplyChainToolingCheck::class => fn (): AbstractCheck => new SupplyChainToolingCheck($basePath),
            PathTraversalCheck::class => fn (): AbstractCheck => new PathTraversalCheck($basePath),
            WeakCryptographyCheck::class => fn (): AbstractCheck => new WeakCryptographyCheck($basePath),
            InsecureRngCheck::class => fn (): AbstractCheck => new InsecureRngCheck($basePath),
            SessionSecurityCheck::class => fn (): AbstractCheck => new SessionSecurityCheck($basePath),
            EolVersionCheck::class => fn (): AbstractCheck => new EolVersionCheck($basePath),
        ];

        $enabled = (array) config('checkpoint.checks', []);
        $scanner = new self;

        foreach ($factories as $class => $factory) {
            if (($enabled[$class] ?? true) === false) {
                continue;
            }

            $scanner->add($factory());
        }

        foreach ($enabled as $class => $isEnabled) {
            if ($isEnabled === false) {
                continue;
            }

            if (! is_string($class)) {
                continue;
            }

            if (! str_starts_with($class, self::APPLICATION_CHECK_NAMESPACE)) {
                continue;
            }

            if (! is_subclass_of($class, AbstractCheck::class)) {
                continue;
            }

            $check = new $class($basePath);
            $scanner->add($check);
        }

        return $scanner;
    }

    public function add(AbstractCheck $check): static
    {
        $this->checks[] = $check;

        return $this;
    }

    /**
     * @return array<string, CheckResult>
     */
    public function run(): array
    {
        $results = [];

        foreach ($this->checks as $check) {
            $results[$check->name()] = $check->run();
        }

        return $results;
    }
}
