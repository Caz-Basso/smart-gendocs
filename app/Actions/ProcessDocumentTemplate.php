<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use ZipArchive;

final readonly class ProcessDocumentTemplate
{
    public function __construct(
        private ConvertPdfToDocx $convertPdfToDocx = new ConvertPdfToDocx(),
    ) {}

    /**
     * Processa um arquivo DOCX ou PDF, identificando automaticamente o formato real.
     * Arquivos DOCX são encaminhados diretamente ao fluxo DOCX existente.
     * Arquivos PDF são convertidos para DOCX (ignorando cabeçalhos e rodapés originais)
     * e então encaminhados exatamente ao mesmo fluxo DOCX existente.
     *
     * @return array{
     *     documentType: string,
     *     html: string,
     *     fieldsDetected: array<int, string>,
     *     isScanned: bool,
     *     isDocx: bool,
     *     wasConvertedFromPdf: bool,
     *     headersFootersIgnored?: bool,
     *     headersFootersCount?: int,
     *     convertedDocxPath?: string,
     *     warnings?: array<int, string>
     * }
     */
    public function handle(string|UploadedFile $file): array
    {
        $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;

        if (! is_string($filePath) || ! is_file($filePath)) {
            throw new RuntimeException('Arquivo não encontrado para processamento.');
        }

        // Identifica o formato real baseado nos magic bytes / estrutura interna
        $format = $this->identifyRealFormat($filePath);

        $scriptPath = base_path('resources/scripts/document_processor.py');
        if (! is_file($scriptPath)) {
            throw new RuntimeException('Script do processador de documentos não encontrado.');
        }

        if ($format === 'docx') {
            // Fluxo DOCX existente: direto para o processamento OpenXML/HTML
            $decoded = $this->runDocxProcessor($scriptPath, $filePath);

            return [
                'documentType' => 'docx',
                'html' => $decoded['html'],
                'fieldsDetected' => $decoded['fieldsDetected'] ?? [],
                'isScanned' => false,
                'isDocx' => true,
                'wasConvertedFromPdf' => false,
                'headersFootersIgnored' => false,
                'headersFootersCount' => 0,
                'warnings' => [],
            ];
        }

        // Fluxo PDF: Converte PDF para DOCX (ignorando cabeçalhos e rodapés originais)
        $conversion = $this->convertPdfToDocx->handle($filePath);

        // Encaminha o DOCX convertido diretamente ao mesmo fluxo de processamento DOCX existente
        $decoded = $this->runDocxProcessor($scriptPath, $conversion['docxPath']);

        return [
            'documentType' => $conversion['isScanned'] ? 'pdf_scanned' : 'pdf_digital',
            'html' => $decoded['html'],
            'fieldsDetected' => $decoded['fieldsDetected'] ?? [],
            'isScanned' => $conversion['isScanned'],
            'isDocx' => false,
            'wasConvertedFromPdf' => true,
            'headersFootersIgnored' => $conversion['headersFootersIgnored'] ?? false,
            'headersFootersCount' => $conversion['headersFootersCount'] ?? 0,
            'convertedDocxPath' => $conversion['docxPath'],
            'warnings' => $conversion['warnings'] ?? [],
        ];
    }

    /**
     * Identifica o formato real do documento inspecionando magic bytes e estrutura do arquivo.
     */
    public function identifyRealFormat(string $filePath): string
    {
        if (! is_file($filePath)) {
            throw new RuntimeException('Arquivo não encontrado para validação.');
        }

        $size = filesize($filePath);
        if ($size === 0) {
            throw new RuntimeException('O arquivo enviado está vazio (0 bytes).');
        }

        $handle = fopen($filePath, 'rb');
        if (! $handle) {
            throw new RuntimeException('Não foi possível ler o arquivo enviado.');
        }

        $header = fread($handle, 2048);
        fclose($handle);

        if ($header !== false && str_contains($header, '%PDF-')) {
            return 'pdf';
        }

        if ($header !== false && str_starts_with($header, "PK\x03\x04")) {
            $zip = new ZipArchive();
            if ($zip->open($filePath) === true) {
                $hasContentTypes = $zip->locateName('[Content_Types].xml') !== false;
                $hasWordDoc = $zip->locateName('word/document.xml') !== false;
                $zip->close();

                if ($hasContentTypes && $hasWordDoc) {
                    return 'docx';
                }
            }
        }

        throw new RuntimeException('Formato de arquivo não suportado ou corrompido. Envie um documento PDF ou DOCX válido.');
    }

    /**
     * Executa o processador DOCX existente em Python e decodifica a saída JSON.
     *
     * @return array{
     *     documentType: string,
     *     html: string,
     *     fieldsDetected: array<int, string>,
     *     isScanned: bool,
     *     isDocx: bool
     * }
     */
    private function runDocxProcessor(string $scriptPath, string $docxPath): array
    {
        $result = Process::timeout(180)->run([
            'python3',
            $scriptPath,
            $docxPath,
        ]);

        if (! $result->successful()) {
            throw new RuntimeException(
                'Falha ao processar documento: '.($result->errorOutput() ?: $result->output())
            );
        }

        $output = $result->output();
        $jsonString = $output;
        if (preg_match('/\{[\s\S]*\}/', $output, $matches)) {
            $jsonString = $matches[0];
        }

        /** @var array{
         *     documentType: string,
         *     html: string,
         *     fieldsDetected: array<int, string>,
         *     isScanned: bool,
         *     isDocx: bool
         * }|null $decoded */
        $decoded = json_decode($jsonString, true);

        if (! is_array($decoded) || ! isset($decoded['html'])) {
            throw new RuntimeException('Saída inválida do processador de documentos.');
        }

        return $decoded;
    }
}
