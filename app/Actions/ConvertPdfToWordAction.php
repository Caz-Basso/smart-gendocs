<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final readonly class ConvertPdfToWordAction
{
    /**
     * Converte o PDF do usuário em um DOCX (bytes) via microserviço pdf2docx,
     * preservando a estrutura (parágrafos, títulos e tabelas) do original.
     */
    public function handle(UploadedFile $file): string
    {
        $endpoint = mb_rtrim((string) config('services.pdf_converter.endpoint'), '/').'/convert';

        try {
            $response = Http::timeout(120)
                ->attach('file', $file->getContent(), $file->getClientOriginalName())
                ->post($endpoint);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Serviço de conversão indisponível.', 0, $exception);
        }

        if ($response->failed()) {
            $detail = (string) data_get($response->json(), 'detail', 'Falha ao converter o PDF.');

            throw new RuntimeException($detail);
        }

        return $response->body();
    }
}
