<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use RuntimeException;

final readonly class ProcessDocumentTemplate
{
    /**
     * Processa um arquivo DOCX ou PDF, reconstruindo-o como documento estruturado contínuo.
     * Aplica OCR (Tesseract via Python) exclusivamente quando não há camada de texto utilizável.
     *
     * @return array{
     *     documentType: string,
     *     html: string,
     *     fieldsDetected: array<int, string>,
     *     isScanned: bool,
     *     isDocx: bool
     * }
     */
    public function handle(string|UploadedFile $file): array
    {
        $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        if (! is_string($filePath) || ! is_file($filePath)) {
            throw new RuntimeException('Arquivo não encontrado para processamento.');
        }

        $scriptPath = base_path('resources/scripts/document_processor.py');

        if (! is_file($scriptPath)) {
            throw new RuntimeException('Script do processador de documentos não encontrado.');
        }

        $result = Process::timeout(180)->run([
            'python3',
            $scriptPath,
            $filePath,
        ]);

        if (! $result->successful()) {
            throw new RuntimeException(
                'Falha ao processar documento: '.($result->error() ?: $result->output())
            );
        }

        $output = $result->output();
        /** @var array{
         *     documentType: string,
         *     html: string,
         *     fieldsDetected: array<int, string>,
         *     isScanned: bool,
         *     isDocx: bool
         * }|null $decoded */
        $decoded = json_decode($output, true);

        if (! is_array($decoded) || ! isset($decoded['html'])) {
            throw new RuntimeException('Saída inválida do processador de documentos.');
        }

        return $decoded;
    }
}
