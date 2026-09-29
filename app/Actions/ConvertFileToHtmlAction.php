<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;

final readonly class ConvertFileToHtmlAction
{
    public function handle(UploadedFile $file): string
    {
        $extension = mb_strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'pdf' => $this->convertPdfToHtml($file),
            'docx' => $this->convertDocxToHtml($file),
            default => throw new RuntimeException('Formato de arquivo não suportado. Use PDF ou DOCX.'),
        };
    }

    private function convertPdfToHtml(UploadedFile $file): string
    {
        try {
            $response = Http::connectTimeout(5)
                ->timeout(130)
                ->attach(
                    'file',
                    $file->get(),
                    $file->getClientOriginalName(),
                    ['Content-Type' => 'application/pdf'],
                )
                ->post(mb_rtrim((string) config('services.pdf2htmlex.url'), '/').'/convert')
                ->throw();
        } catch (ConnectionException|RequestException $exception) {
            throw new RuntimeException('O serviço pdf2htmlEX não está disponível.', previous: $exception);
        }

        $html = $response->json('html');

        if (! is_string($html) || $html === '') {
            throw new RuntimeException('O pdf2htmlEX não retornou HTML para este PDF.');
        }

        return $html;
    }

    private function convertDocxToHtml(UploadedFile $file): string
    {
        $phpWord = IOFactory::load($file->getPathname());

        $htmlWriter = IOFactory::createWriter($phpWord, 'HTML');
        ob_start();
        $htmlWriter->save('php://output');
        $html = ob_get_clean();

        return $html;
    }
}
