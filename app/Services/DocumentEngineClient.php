<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class DocumentEngineClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = mb_rtrim((string) config('services.doc_engine.url', 'http://doc-engine:8000'), '/');
    }

    public function isAvailable(): bool
    {
        try {
            $response = Http::connectTimeout(2)
                ->timeout(3)
                ->get("{$this->baseUrl}/health");

            return $response->successful() && $response->json('status') === 'healthy';
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array{status: string, document_type: string, page_count: int, html: string, structure: array<string, mixed>}|null
     */
    public function analyzePdf(string $filePath, ?string $originalName = null): ?array
    {
        if (! file_exists($filePath)) {
            return null;
        }

        try {
            $name = $originalName ?? basename($filePath);
            $fileContents = file_get_contents($filePath);

            if ($fileContents === false) {
                return null;
            }

            $response = Http::connectTimeout(3)
                ->timeout(45)
                ->attach('file', $fileContents, $name, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze");

            if ($response->successful()) {
                $data = $response->json();

                if (is_array($data) && isset($data['html']) && is_string($data['html'])) {
                    return $data;
                }
            }

            Log::warning('Document Engine respondeu com erro ao analisar PDF', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);
        } catch (Throwable $e) {
            Log::info('Document Engine indisponível ou inacessível no momento, utilizando fallback nativo: '.$e->getMessage());
        }

        return null;
    }
}
