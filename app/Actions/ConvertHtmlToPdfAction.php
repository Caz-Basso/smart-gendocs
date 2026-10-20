<?php

declare(strict_types=1);

namespace App\Actions;

use App\Services\GotenbergClient;
use RuntimeException;

final readonly class ConvertHtmlToPdfAction
{
    public function __construct(private GotenbergClient $gotenberg = new GotenbergClient) {}

    public function handle(string $html, ?string $headerHtml = null, ?string $footerHtml = null): string
    {
        if (! $this->gotenberg->isAvailable()) {
            throw new RuntimeException('Serviço de geração de PDF (Gotenberg) não está disponível.');
        }

        return $this->gotenberg->convertA4HtmlToPdf($html, $headerHtml, $footerHtml);
    }
}
