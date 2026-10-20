<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use RuntimeException;

final readonly class GenerateDocumentAction
{
    public function __construct(private ConvertHtmlToPdfAction $convertToPdf = new ConvertHtmlToPdfAction) {}

    public function handle(string $modelId, array $data): array
    {
        $model = DocumentModel::findOrFail($modelId);

        if ($model->document_structure !== null && $model->template_path !== null) {
            return $this->generateFromStructure($model, $data);
        }

        $htmlContent = $model->html_content ?? $model->extracted_text ?? '';

        foreach ($data as $key => $value) {
            $placeholder = '{{'.$key.'}}';
            $htmlContent = str_replace($placeholder, htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), $htmlContent);
        }

        $styledHtml = $this->wrapWithInstitutionalA4Styles($htmlContent, $model->name);
        $headerHtml = $this->getInstitutionalHeader();
        $footerHtml = $this->getInstitutionalFooter();

        try {
            $pdf = $this->convertToPdf->handle($styledHtml, $headerHtml, $footerHtml);
        } catch (RuntimeException $e) {
            throw new RuntimeException('Erro ao gerar PDF: '.$e->getMessage(), previous: $e);
        }

        return [
            'pdf' => $pdf,
            'html' => $htmlContent,
        ];
    }

    /** @param array<string, mixed> $data */
    private function generateFromStructure(DocumentModel $model, array $data): array
    {
        if (! empty($model->html_content) || ! empty($model->extracted_text)) {
            $html = $model->html_content ?? $model->extracted_text;

            foreach ($data as $key => $value) {
                $html = str_replace('{{'.$key.'}}', htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), $html);
            }

            $styledHtml = $this->wrapWithInstitutionalA4Styles($html, $model->name);
            $headerHtml = $this->getInstitutionalHeader();
            $footerHtml = $this->getInstitutionalFooter();

            try {
                $pdf = $this->convertToPdf->handle($styledHtml, $headerHtml, $footerHtml);
            } catch (RuntimeException $e) {
                throw new RuntimeException('Erro ao gerar PDF: '.$e->getMessage(), previous: $e);
            }

            return [
                'pdf' => $pdf,
                'html' => $html,
            ];
        }

        $templatePath = Storage::disk('public')->path($model->template_path);

        if (! is_file($templatePath)) {
            throw new RuntimeException('O PDF original deste modelo não foi encontrado.');
        }

        $structure = $model->document_structure;
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 0,
            'margin_right' => 0,
            'margin_top' => 0,
            'margin_bottom' => 0,
        ]);

        $pageCount = $mpdf->SetSourceFile($templatePath);

        if (count($structure['pages']) > $pageCount) {
            throw new RuntimeException('A estrutura salva não corresponde às páginas do PDF original.');
        }

        $mpdf->AddPage();

        foreach ($structure['pages'] as $pageIndex => $page) {
            if ($pageIndex > 0) {
                $mpdf->AddPage();
            }

            $templateId = $mpdf->ImportPage($pageIndex + 1);
            $size = $mpdf->UseTemplate($templateId, 0, 0, null, null, true);

            foreach ($page['elements'] as $element) {
                $x = (float) $element['x'] * $size['width'];
                $y = (float) $element['y'] * $size['height'];
                $width = max(1.0, (float) $element['width'] * $size['width']);
                $height = max(1.0, (float) $element['height'] * $size['height']);
                $text = (string) ($element['text'] ?? '');
                $originalText = (string) ($element['originalText'] ?? $text);

                foreach ($data as $key => $value) {
                    if (is_scalar($value)) {
                        $text = str_replace('{{'.$key.'}}', (string) $value, $text);
                    }
                }

                if ($text === $originalText) {
                    continue;
                }

                $escapedText = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                $fontSize = min(24, max(8, (float) ($element['fontSize'] ?? 11)));

                $mpdf->WriteFixedPosHTML(
                    '<div style="font-family: sans-serif; font-size: '.$fontSize.'pt; line-height: 1.3; color: #111; margin: 0; padding: 0; word-wrap: break-word;">'.$escapedText.'</div>',
                    $x,
                    $y,
                    $width,
                    $height,
                    'auto',
                );
            }
        }

        if ($pageCount > count($structure['pages'])) {
            for ($pageNumber = count($structure['pages']) + 1; $pageNumber <= $pageCount; $pageNumber++) {
                $mpdf->AddPage();
                $templateId = $mpdf->ImportPage($pageNumber);
                $mpdf->UseTemplate($templateId, 0, 0, null, null, true);
            }
        }

        return [
            'pdf' => $mpdf->Output('', 'S'),
            'html' => $model->html_content ?? '',
        ];
    }

    /**
     * Aplica folha de estilos A4 institucional limpa e compatível com Gotenberg/Chromium.
     */
    private function wrapWithInstitutionalA4Styles(string $content, string $title): string
    {
        $escapedTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{$escapedTitle}</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin-top: 25mm;
                    margin-bottom: 25mm;
                    margin-left: 20mm;
                    margin-right: 20mm;
                }
                body {
                    font-family: 'Aptos', 'Calibri', 'Arial', sans-serif;
                    font-size: 11pt;
                    line-height: 1.6;
                    color: #222;
                }
                h1, h2, h3, h4 {
                    color: #0b3d2c;
                    margin-top: 18pt;
                    margin-bottom: 8pt;
                    font-weight: bold;
                    page-break-after: avoid;
                }
                h1 { font-size: 16pt; text-align: center; }
                h2 { font-size: 13pt; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
                h3 { font-size: 11pt; }
                p {
                    margin-bottom: 10pt;
                    text-align: justify;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 14pt 0;
                    page-break-inside: auto;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 6pt 8pt;
                    font-size: 10pt;
                    text-align: left;
                    vertical-align: top;
                }
                th {
                    background-color: #f4f6f5;
                    color: #0b3d2c;
                    font-weight: bold;
                }
                tr {
                    page-break-inside: avoid;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                .page-break {
                    page-break-after: always;
                }
            </style>
        </head>
        <body>
            {$content}
        </body>
        </html>
        HTML;
    }

    private function getInstitutionalHeader(): string
    {
        return <<<'HTML'
        <div style="text-align: center; font-size: 10pt; color: #666; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
            <strong>UNIVERSIDADE DO EXTREMO SUL CATARINENSE - UNESC</strong>
        </div>
        HTML;
    }

    private function getInstitutionalFooter(): string
    {
        return <<<'HTML'
        <div style="text-align: center; font-size: 9pt; color: #666; padding-top: 10px; border-top: 1px solid #ddd;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
        HTML;
    }
}
