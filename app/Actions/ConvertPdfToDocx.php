<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

final readonly class ConvertPdfToDocx
{
    /**
     * Converte um arquivo PDF (digital ou escaneado) em um documento DOCX editável e válido.
     * Preserva textos, parágrafos, tabelas, imagens e formatações.
     * Para documentos digitalizados, utiliza OCR com Tesseract.
     *
     * @return array{
     *     success: bool,
     *     docxPath: string,
     *     pageCount: int,
     *     isScanned: bool,
     *     hasTables: bool,
     *     hasImages: bool,
     *     conversionMode: string,
     *     paragraphsCount: int,
     *     tablesCount: int,
     *     warnings: array<int, string>
     * }
     */
    public function handle(string|UploadedFile $pdfFile, ?string $outputDocxPath = null): array
    {
        $inputPath = $pdfFile instanceof UploadedFile ? $pdfFile->getRealPath() : $pdfFile;

        if (! is_string($inputPath) || ! is_file($inputPath)) {
            throw new RuntimeException('Arquivo PDF não encontrado para conversão.');
        }

        if ($outputDocxPath === null) {
            $outputDocxPath = tempnam(sys_get_temp_dir(), 'pdf2docx_').'_'.Str::uuid().'.docx';
        }

        $scriptPath = base_path('resources/scripts/pdf_to_docx_converter.py');

        if (! is_file($scriptPath)) {
            throw new RuntimeException('Script de conversão PDF para DOCX não encontrado.');
        }

        $result = Process::timeout(180)->run([
            'python3',
            $scriptPath,
            $inputPath,
            $outputDocxPath,
        ]);

        $output = $result->output();
        $jsonString = $output;
        if (preg_match('/\{[\s\S]*\}/', $output, $matches)) {
            $jsonString = $matches[0];
        }

        /** @var array{
         *     success?: bool,
         *     error?: string,
         *     docxPath?: string,
         *     pageCount?: int,
         *     isScanned?: bool,
         *     hasTables?: bool,
         *     hasImages?: bool,
         *     conversionMode?: string,
         *     paragraphsCount?: int,
         *     tablesCount?: int,
         *     warnings?: array<int, string>
         * }|null $decoded */
        $decoded = json_decode($jsonString, true);

        if (! $result->successful() || (is_array($decoded) && isset($decoded['success']) && ! $decoded['success'])) {
            $errorMessage = is_array($decoded) && ! empty($decoded['error'])
                ? (string) $decoded['error']
                : ($result->errorOutput() ?: $result->output() ?: 'Erro desconhecido durante a conversão do PDF.');

            throw new RuntimeException($errorMessage);
        }

        if (! is_array($decoded) || empty($decoded['docxPath']) || ! is_file($decoded['docxPath'])) {
            throw new RuntimeException('O conversor não gerou o arquivo DOCX esperado.');
        }

        return [
            'success' => true,
            'docxPath' => (string) $decoded['docxPath'],
            'pageCount' => (int) ($decoded['pageCount'] ?? 1),
            'isScanned' => (bool) ($decoded['isScanned'] ?? false),
            'hasTables' => (bool) ($decoded['hasTables'] ?? false),
            'headersFootersIgnored' => (bool) ($decoded['headersFootersIgnored'] ?? false),
            'headersFootersCount' => (int) ($decoded['headersFootersCount'] ?? 0),
            'conversionMode' => (string) ($decoded['conversionMode'] ?? 'unknown'),
            'paragraphsCount' => (int) ($decoded['paragraphsCount'] ?? 0),
            'tablesCount' => (int) ($decoded['tablesCount'] ?? 0),
            'warnings' => is_array($decoded['warnings'] ?? null) ? $decoded['warnings'] : [],
        ];
    }
}
