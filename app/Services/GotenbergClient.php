<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final readonly class GotenbergClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = mb_rtrim((string) config('services.gotenberg.url', 'http://gotenberg:3000'), '/');
    }

    public function isAvailable(): bool
    {
        try {
            $response = Http::connectTimeout(2)
                ->timeout(3)
                ->get("{$this->baseUrl}/health");

            return $response->successful();
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Convert HTML to PDF using Gotenberg's Chromium engine.
     *
     * @param  string  $html  The HTML content to convert
     * @param  array<string, mixed>  $options  Additional options for PDF generation
     * @return string Binary PDF content
     *
     * @throws \RuntimeException If conversion fails
     */
    public function convertHtmlToPdf(string $html, array $options = []): string
    {
        try {
            $formData = [
                [
                    'name' => 'index.html',
                    'contents' => $html,
                    'filename' => 'index.html',
                ],
            ];

            // Add header if provided
            if (isset($options['header_html']) && is_string($options['header_html'])) {
                $formData[] = [
                    'name' => 'header.html',
                    'contents' => $options['header_html'],
                    'filename' => 'header.html',
                ];
            }

            // Add footer if provided
            if (isset($options['footer_html']) && is_string($options['footer_html'])) {
                $formData[] = [
                    'name' => 'footer.html',
                    'contents' => $options['footer_html'],
                    'filename' => 'footer.html',
                ];
            }

            $response = Http::connectTimeout(5)
                ->timeout(60)
                ->withHeaders([
                    'Accept' => 'application/pdf',
                ])
                ->attach($formData)
                ->post("{$this->baseUrl}/forms/chromium/convert/html");

            if ($response->successful()) {
                return $response->body();
            }

            Log::error('Gotenberg falhou ao converter HTML para PDF', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            throw new RuntimeException('Falha ao converter HTML para PDF via Gotenberg.');
        } catch (Throwable $e) {
            Log::error('Erro ao comunicar com Gotenberg', [
                'message' => $e->getMessage(),
            ]);

            throw new RuntimeException('Erro ao comunicar com serviço de geração de PDF: '.$e->getMessage(), previous: $e);
        }
    }

    /**
     * Convert HTML with A4 page dimensions and institutional margins.
     *
     * @param  string  $html  The HTML content to convert
     * @param  string|null  $headerHtml  Optional header HTML
     * @param  string|null  $footerHtml  Optional footer HTML
     * @return string Binary PDF content
     *
     * @throws \RuntimeException If conversion fails
     */
    public function convertA4HtmlToPdf(
        string $html,
        ?string $headerHtml = null,
        ?string $footerHtml = null,
    ): string {
        $options = [
            'paperWidth' => '8.27in',
            'paperHeight' => '11.69in',
            'marginTop' => '0.98in',
            'marginBottom' => '0.98in',
            'marginLeft' => '0.79in',
            'marginRight' => '0.79in',
        ];

        if ($headerHtml !== null) {
            $options['header_html'] = $headerHtml;
        }

        if ($footerHtml !== null) {
            $options['footer_html'] = $footerHtml;
        }

        return $this->convertHtmlToPdf($html, $options);
    }
}
