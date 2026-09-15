<?php

declare(strict_types=1);

use App\Checkpoint\Checks\BunAuditCheck;
use App\Checkpoint\Checks\BunSupplyChainCheck;
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

return [

    /*
    |--------------------------------------------------------------------------
    | Enabled Checks
    |--------------------------------------------------------------------------
    |
    | Every default check is listed here and enabled by default. Set any
    | entry to `false` to exclude it from `php artisan checkpoint:scan`.
    |
    | Application checks under App\Checkpoint\Checks\ are picked up automatically
    | when listed here. The package Scanner is replaced via composer autoload
    | (app/Checkpoint/Scanner.php) — no custom Artisan command needed.
    | Checks not listed in this map fall back to enabled — so when you
    | upgrade Checkpoint and new checks are added, you keep the protection
    | without re-publishing this file.
    |
    */

    'checks' => [
        ComposerAuditCheck::class => true,
        NpmAuditCheck::class => false,
        EnvironmentCheck::class => true,
        GitIgnoreCheck::class => true,
        FilePermissionsCheck::class => true,
        HardcodedSecretsCheck::class => true,
        SqlInjectionCheck::class => true,
        MassAssignmentCheck::class => true,
        XssCheck::class => true,
        CsrfCheck::class => true,
        OpenRedirectCheck::class => true,
        CommandInjectionCheck::class => true,
        InsecureDeserializationCheck::class => true,
        DebugFunctionsCheck::class => true,
        SensitiveExposureCheck::class => true,
        SsrfCheck::class => true,
        TlsVerificationCheck::class => true,
        CorsConfigCheck::class => true,
        PackageFreshnessCheck::class => true,
        SuspiciousVendorAutoloadCheck::class => true,
        SupplyChainToolingCheck::class => false,
        BunAuditCheck::class => true,
        BunSupplyChainCheck::class => true,
        PathTraversalCheck::class => true,
        WeakCryptographyCheck::class => true,
        InsecureRngCheck::class => true,
        SessionSecurityCheck::class => true,
        EolVersionCheck::class => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Package Freshness (Supply Chain)
    |--------------------------------------------------------------------------
    |
    | Composer packages released within `minimum_age_days` will fail the
    | "Package Freshness" check. This mitigates supply-chain attacks that
    | typically get caught and removed from Packagist within hours or days.
    |
    | Add fully-qualified package names to `whitelist` to bypass the age
    | check for specific dependencies (e.g. a critical security patch you
    | need to deploy before the freshness window expires).
    |
    */

    'package_freshness' => [
        'minimum_age_days' => 3,
        'whitelist' => [
            // Checkpoint exempts itself from the freshness gate so a fresh
            // release of the scanner cannot block its own user's deploy.
            'andreapollastri/checkpoint',
            // 'vendor/package',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Suspicious Vendor Autoload
    |--------------------------------------------------------------------------
    |
    | The "Suspicious Vendor Autoload" check warns when a package under
    | vendor/ registers PHP files via `autoload.files` — the exact mechanism
    | abused by the May 2026 Laravel-Lang supply-chain attack to execute
    | code on every request.
    |
    | A baked-in whitelist already covers packages that legitimately use
    | this mechanism (laravel/framework, symfony/polyfill-*, guzzlehttp/*,
    | ramsey/uuid, …). Add your own trusted entries below — exact matches
    | or `vendor/*` wildcards are both supported.
    |
    */

    'suspicious_autoload' => [
        'whitelist' => [
            // Runtime (require)
            'inertiajs/inertia-laravel',
            'lab404/laravel-impersonate',
            'laravel/prompts',
            'pragmarx/google2fa',
            'ralouphie/getallheaders',
            'spatie/laravel-permission',
            'symfony/clock',
            'symfony/string',
            'symfony/translation',
            'symfony/var-dumper',

            // Laravel ecosystem (require-dev / tooling)
            'clcbws/laravel-agents-debug',
            'fruitcake/laravel-debugbar',
            'laradumps/*',
            'laravel/agent-detector',
            'laravel/pao',
            'laravel/tinker',
            'psy/psysh',

            // Test & static analysis
            'mockery/*',
            'myclabs/deep-copy',
            'nunomaduro/*',
            'pestphp/*',
            'phpstan/phpstan',
            'phpunit/phpunit',
            'rector/rector',
            'sebastian/*',

            // Transitive: Amp (e.g. pest-plugin-browser, laravel/pao)
            'amphp/*',
            'daverandom/libdns',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Suppressed Findings
    |--------------------------------------------------------------------------
    |
    | Add 12-character finding hashes here to silence specific FAIL/WARN
    | issues you have intentionally accepted (false positive, legacy code,
    | etc.). Hashes are shown in square brackets next to each finding when
    | you run the scan — copy the bracketed value into this array.
    |
    | The hash is content-stable: refactors that only shift line numbers
    | will not invalidate it.
    |
    | If every finding of a check is suppressed, the check is downgraded to
    | PASS with an explicit "N suppressed" message.
    |
    */

    'suppressed' => [
        // 'a1b2c3d4e5f6',
    ],

];
