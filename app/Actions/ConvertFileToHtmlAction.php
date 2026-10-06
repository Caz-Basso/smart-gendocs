<?php

declare(strict_types=1);

namespace App\Actions;

use App\Services\DocumentEngineClient;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpWord\IOFactory;
use RuntimeException;
use Smalot\PdfParser\Page;
use Smalot\PdfParser\Parser;
use Throwable;

final readonly class ConvertFileToHtmlAction
{
    public function __construct(
        private DocumentEngineClient $docEngineClient = new DocumentEngineClient,
    ) {}

    public function handle(UploadedFile $file): string
    {
        $extension = mb_strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'pdf' => $this->convertPdfToHtml($file),
            'docx' => $this->convertDocxToHtml($file),
            default => throw new RuntimeException('Formato de arquivo não suportado. Use PDF ou DOCX.'),
        };
    }

    public function convertPdfPathToHtml(string $filePath, ?string $originalName = null): string
    {
        // 1. Tenta utilizar o microserviço especializado PyMuPDF + pdfplumber
        $analyzed = $this->docEngineClient->analyzePdf($filePath, $originalName);

        if ($analyzed !== null && ! empty($analyzed['html'])) {
            return $analyzed['html'];
        }

        // 2. Fallback nativo resiliente com ordenação por coordenadas espaciais
        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($filePath);
            $pages = $pdf->getPages();

            if (empty($pages)) {
                throw new RuntimeException('O documento PDF não contém páginas.');
            }

            $html = '';
            $totalPages = count($pages);

            foreach ($pages as $index => $page) {
                $pageNum = $index + 1;
                $html .= $this->extractPageHtml($page, $pageNum, $totalPages);
            }

            if (mb_trim($html) === '') {
                throw new RuntimeException('O documento PDF não contém texto extraível.');
            }

            return $html;
        } catch (Throwable $exception) {
            throw new RuntimeException('Não foi possível converter o PDF para HTML: '.$exception->getMessage(), previous: $exception);
        }
    }

    private function convertPdfToHtml(UploadedFile $file): string
    {
        return $this->convertPdfPathToHtml($file->getPathname(), $file->getClientOriginalName());
    }

    private function extractPageHtml(Page $page, int $pageNum, int $totalPages): string
    {
        $items = [];
        try {
            $items = $page->getDataTm();
        } catch (Throwable) {
            $items = [];
        }

        if (! empty($items)) {
            return $this->extractPageFromTm($items, $pageNum, $totalPages);
        }

        try {
            $rawText = $page->getText();
        } catch (Throwable) {
            $rawText = '';
        }

        return $this->extractPageFromRawText($rawText, $pageNum, $totalPages);
    }

    /**
     * @param  array<int, array{0: array<int, float>, 1: string}>  $items
     */
    private function extractPageFromTm(array $items, int $pageNum, int $totalPages): string
    {
        $lines = [];

        foreach ($items as $item) {
            $text = $item[1];
            if (mb_trim($text) === '') {
                continue;
            }

            $x = (float) $item[0][4];
            $y = (float) $item[0][5];

            $matched = false;
            foreach ($lines as &$line) {
                if (abs($line['y'] - $y) < 3.5) {
                    $line['items'][] = ['x' => $x, 'text' => $text];
                    $matched = true;
                    break;
                }
            }
            unset($line);

            if (! $matched) {
                $lines[] = [
                    'y' => $y,
                    'items' => [['x' => $x, 'text' => $text]],
                ];
            }
        }

        // Ordenação visual precisa: do topo para a base (Y decrescente)
        usort($lines, fn ($a, $b) => $b['y'] <=> $a['y']);

        $headerLines = [];
        $bodyLines = [];
        $footerLines = [];

        foreach ($lines as $line) {
            // Ordena elementos horizontais da linha (X crescente, da esquerda para direita)
            usort($line['items'], fn ($a, $b) => $a['x'] <=> $b['x']);
            $lineText = mb_trim(implode('', array_column($line['items'], 'text')));

            if ($lineText === '') {
                continue;
            }

            // Y >= 750 pt: cabeçalho
            // Y <= 55 pt: rodapé (ex.: "1 / 10", FUCRI, endereço, CEP)
            // 55 < Y < 750: corpo do texto
            if ($line['y'] >= 750.0) {
                $headerLines[] = $lineText;
            } elseif ($line['y'] <= 55.0) {
                $footerLines[] = $lineText;
            } else {
                $bodyLines[] = $lineText;
            }
        }

        $headerHtml = '';
        if (! empty($headerLines)) {
            $headerHtml = '<div class="pdf-header" style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-size: 11px; color: #64748b; text-align: center;">'
                .implode('<br>', array_map(fn ($l) => htmlspecialchars($l, ENT_QUOTES, 'UTF-8'), $headerLines))
                .'</div>';
        }

        $bodyHtml = '<div class="pdf-body" style="flex: 1 1 auto;">';
        foreach ($bodyLines as $lineText) {
            $isTitle = str_starts_with($lineText, 'CONTRATO') || str_starts_with($lineText, 'EDITAL') || str_starts_with($lineText, 'ANEXO');
            $isClause = str_starts_with($lineText, 'CLÁUSULA') || str_starts_with($lineText, 'CLAUSULA');

            if ($isTitle) {
                $bodyHtml .= '<h2 style="font-size: 14px; font-weight: 700; text-align: center; text-transform: uppercase; margin: 18px 0 12px 0; color: #0f172a;">'.htmlspecialchars($lineText, ENT_QUOTES, 'UTF-8').'</h2>';
            } elseif ($isClause) {
                $bodyHtml .= '<p style="margin-top: 14px; margin-bottom: 6px; font-weight: 700; font-size: 12px; color: #1e293b;">'.htmlspecialchars($lineText, ENT_QUOTES, 'UTF-8').'</p>';
            } else {
                $bodyHtml .= '<p style="margin-bottom: 8px; line-height: 1.6; font-size: 12.5px; text-align: justify; color: #334155;">'.htmlspecialchars($lineText, ENT_QUOTES, 'UTF-8').'</p>';
            }
        }
        $bodyHtml .= '</div>';

        $footerHtml = '';
        if (! empty($footerLines)) {
            $footerHtml = '<div class="pdf-footer" style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10.5px; color: #64748b; text-align: center; line-height: 1.5;">'
                .implode('<br>', array_map(fn ($l) => htmlspecialchars($l, ENT_QUOTES, 'UTF-8'), $footerLines))
                .'</div>';
        }

        return "<div class=\"pdf-page pf\" data-page-no=\"{$pageNum}\" style=\"box-sizing: border-box; width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto 30px auto; padding: 25mm 20mm; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Aptos', 'Calibri', 'Arial', sans-serif;\">{$headerHtml}{$bodyHtml}{$footerHtml}</div>";
    }

    private function extractPageFromRawText(string $rawText, int $pageNum, int $totalPages): string
    {
        $lines = array_filter(array_map('mb_trim', explode("\n", $rawText)));
        $bodyHtml = '<div class="pdf-body" style="flex: 1 1 auto;">';
        foreach ($lines as $line) {
            $bodyHtml .= '<p style="margin-bottom: 8px; line-height: 1.6; font-size: 12.5px; text-align: justify; color: #334155;">'.htmlspecialchars($line, ENT_QUOTES, 'UTF-8').'</p>';
        }
        $bodyHtml .= '</div>';

        return "<div class=\"pdf-page pf\" data-page-no=\"{$pageNum}\" style=\"box-sizing: border-box; width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto 30px auto; padding: 25mm 20mm; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Aptos', 'Calibri', 'Arial', sans-serif;\">{$bodyHtml}</div>";
    }

    private function convertDocxToHtml(UploadedFile $file): string
    {
        $phpWord = IOFactory::load($file->getPathname());

        $htmlWriter = IOFactory::createWriter($phpWord, 'HTML');
        ob_start();
        $htmlWriter->save('php://output');
        $html = (string) ob_get_clean();

        return $html;
    }
}
