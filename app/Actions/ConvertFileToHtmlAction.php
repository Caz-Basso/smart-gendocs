<?php

declare(strict_types=1);

namespace App\Actions;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;
use Smalot\PdfParser\Parser as PdfParser;

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
        $parser = new PdfParser();
        $pdf = $parser->parseFile($file->getPathname());
        $text = $pdf->getText();

        $html = '<div class="pdf-content">';
        $paragraphs = explode("\n", $text);

        foreach ($paragraphs as $paragraph) {
            $paragraph = mb_trim($paragraph);
            if ($paragraph !== '') {
                $html .= '<p>'.htmlspecialchars($paragraph, ENT_QUOTES | ENT_HTML5, 'UTF-8').'</p>';
            }
        }

        $html .= '</div>';

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
