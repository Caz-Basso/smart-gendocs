<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use RuntimeException;

final readonly class GenerateDocumentAction
{
    public function handle(string $modelId, array $data): string
    {
        $model = DocumentModel::with(['modelElements.documentElement'])->findOrFail($modelId);

        if ($model->document_structure !== null && $model->template_path !== null && ! empty($model->document_structure['pages'] ?? [])) {
            return $this->generateFromStructure($model, $data);
        }

        // Substituir os placeholders pelos dados no HTML rico estruturado
        $content = $model->extracted_text ?? '';

        foreach ($data as $key => $value) {
            if (is_scalar($value)) {
                $placeholder = '{{'.$key.'}}';
                $content = str_replace($placeholder, (string) $value, $content);
            }
        }

        // Injeta os cabeçalhos e rodapés institucionais associados ao modelo
        $content = $this->injectElementsIntoHtml($content, $model);

        // Extrair configurações de margens e tipografia se presentes no HTML
        $marginTop = 30;
        $marginLeft = 30;
        $marginRight = 20;
        $marginBottom = 20;

        if (preg_match('/<!--\s*a4-config:\s*([^>]+)\s*-->/', $content, $matches)) {
            if (preg_match('/top=(\d+)/', $matches[1], $topMatch)) {
                $marginTop = (int) $topMatch[1];
            }
            if (preg_match('/left=(\d+)/', $matches[1], $leftMatch)) {
                $marginLeft = (int) $leftMatch[1];
            }
            if (preg_match('/right=(\d+)/', $matches[1], $rightMatch)) {
                $marginRight = (int) $rightMatch[1];
            }
            if (preg_match('/bottom=(\d+)/', $matches[1], $bottomMatch)) {
                $marginBottom = (int) $bottomMatch[1];
            }
        }

        // Criar PDF com mPDF suportando estilos de documento oficial/jurídico, tabelas, imagens e reflow
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => $marginLeft,
            'margin_right' => $marginRight,
            'margin_top' => $marginTop,
            'margin_bottom' => $marginBottom,
        ]);

        $styledHtml = '
        <style>
            body {
                font-family: "DejaVu Serif", "Times New Roman", Times, Georgia, serif;
                font-size: 12pt;
                color: #111827;
                line-height: 1.5;
            }
            h1, h2, h3 {
                color: #0f172a;
                font-family: "DejaVu Serif", "Times New Roman", serif;
                margin-top: 14pt;
                margin-bottom: 8pt;
            }
            h1 { font-size: 16pt; text-align: center; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; font-weight: bold; }
            p {
                margin-bottom: 6pt;
                text-align: justify;
                line-height: 1.5;
            }
            table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 10pt; }
            td, th { border: 1px solid #94a3b8; padding: 6pt 8pt; vertical-align: top; }
            img { max-width: 100%; height: auto; display: inline-block; }
            .page-break { page-break-after: always; }
            .document-header { margin-bottom: 16pt; text-align: center; font-size: 10.5pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 8pt; }
            .document-footer { margin-top: 20pt; text-align: center; font-size: 9pt; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 8pt; }
            .citation-long { margin-left: 4.0cm; font-size: 10pt; line-height: 1.0; text-align: justify; margin-top: 8pt; margin-bottom: 8pt; }
        </style>
        '.$content;

        $mpdf->WriteHTML($styledHtml);

        return $mpdf->Output('', 'S');
    }

    /** @param array<string, mixed> $data */
    private function generateFromStructure(DocumentModel $model, array $data): string
    {
        $templatePath = Storage::disk('public')->path($model->template_path);

        if (str_ends_with(mb_strtolower($templatePath), '.docx')) {
            $convertedPath = $templatePath.'.converted.pdf';
            if (! is_file($convertedPath)) {
                $outputDir = dirname($templatePath);
                \Illuminate\Support\Facades\Process::timeout(120)->run([
                    'libreoffice',
                    '--headless',
                    '--convert-to',
                    'pdf',
                    '--outdir',
                    $outputDir,
                    $templatePath,
                ]);
                $defaultConverted = $outputDir.'/'.pathinfo($templatePath, PATHINFO_FILENAME).'.pdf';
                if (is_file($defaultConverted)) {
                    rename($defaultConverted, $convertedPath);
                }
            }
            if (is_file($convertedPath)) {
                $templatePath = $convertedPath;
            }
        }

        if (! is_file($templatePath)) {
            throw new RuntimeException('O arquivo original deste modelo não foi encontrado.');
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
                $templateTextLength = max(1, mb_strlen($originalText));

                foreach ($data as $key => $value) {
                    if (is_scalar($value)) {
                        $text = str_replace('{{'.$key.'}}', (string) $value, $text);
                    }
                }

                if ($text === $originalText) {
                    continue;
                }

                $mpdf->SetFillColor(255, 255, 255);
                $mpdf->SetDrawColor(255, 255, 255);
                $mpdf->Rect($x, $y, $width, $height, 'F');

                $escapedText = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                $fontSize = min(200, max(1, (float) $element['fontSize']));
                $fontSize = max(6, $fontSize * min(1, $templateTextLength / max(1, mb_strlen($text))));
                $mpdf->WriteFixedPosHTML(
                    '<div style="font-family: sans-serif; font-size: '.$fontSize.'pt; line-height: 1; margin: 0; padding: 0; white-space: nowrap;">'.$escapedText.'</div>',
                    $x,
                    $y,
                    $width,
                    $height,
                    'hidden',
                );
            }

            // Aplicar cabeçalhos e rodapés institucionais vinculados ao modelo
            foreach ($model->modelElements as $modelElement) {
                if ($modelElement->appliesToPage($pageIndex + 1)) {
                    $element = $modelElement->documentElement;
                    if ($element && $element->image_path) {
                        $localPath = Storage::disk('public')->path($element->image_path);
                        if (is_file($localPath)) {
                            $x = $modelElement->getEffectivePositionX();
                            $y = $modelElement->getEffectivePositionY();
                            $w = $modelElement->getEffectiveWidth();
                            $h = $modelElement->getEffectiveHeight();
                            $mpdf->Image($localPath, $x, $y, $w, $h);
                        }
                    }
                }
            }
        }

        if ($pageCount > count($structure['pages'])) {
            for ($pageNumber = count($structure['pages']) + 1; $pageNumber <= $pageCount; $pageNumber++) {
                $mpdf->AddPage();
                $templateId = $mpdf->ImportPage($pageNumber);
                $mpdf->UseTemplate($templateId, 0, 0, null, null, true);

                foreach ($model->modelElements as $modelElement) {
                    if ($modelElement->appliesToPage($pageNumber)) {
                        $element = $modelElement->documentElement;
                        if ($element && $element->image_path) {
                            $localPath = Storage::disk('public')->path($element->image_path);
                            if (is_file($localPath)) {
                                $x = $modelElement->getEffectivePositionX();
                                $y = $modelElement->getEffectivePositionY();
                                $w = $modelElement->getEffectiveWidth();
                                $h = $modelElement->getEffectiveHeight();
                                $mpdf->Image($localPath, $x, $y, $w, $h);
                            }
                        }
                    }
                }
            }
        }

        return $mpdf->Output('', 'S');
    }

    private function injectElementsIntoHtml(string $content, DocumentModel $model): string
    {
        $elements = $model->modelElements;
        if ($elements->isEmpty()) {
            return $content;
        }

        // Divide o conteúdo em páginas através dos delimitadores de quebra de página
        $parts = preg_split('/(<(?:hr|div)[^>]*class=["\'][^"\']*page-break[^"\']*["\'][^>]*>(?:\s*<\/div>)?|<!--\s*(?:a4-)?page-break\s*-->)/i', $content, -1, PREG_SPLIT_DELIM_CAPTURE);

        if ($parts === false || count($parts) <= 1) {
            $overlayHtml = $this->buildOverlayHtmlForPage($elements, 1);

            return $overlayHtml.$content;
        }

        $result = '';
        $pageNumber = 1;

        foreach ($parts as $part) {
            if (preg_match('/(?:class=["\'][^"\']*page-break[^"\']*["\']|<!--\s*(?:a4-)?page-break\s*-->)/i', $part)) {
                $result .= $part;
                $pageNumber++;
            } else {
                $overlayHtml = $this->buildOverlayHtmlForPage($elements, $pageNumber);
                $result .= $overlayHtml.$part;
            }
        }

        return $result;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, \App\Models\DocumentModelElement>  $elements
     */
    private function buildOverlayHtmlForPage(\Illuminate\Database\Eloquent\Collection $elements, int $pageNumber): string
    {
        $html = '';

        foreach ($elements as $modelElement) {
            if (! $modelElement->appliesToPage($pageNumber)) {
                continue;
            }

            $element = $modelElement->documentElement;
            if (! $element || ! $element->image_path) {
                continue;
            }

            $localPath = Storage::disk('public')->path($element->image_path);
            if (! is_file($localPath)) {
                continue;
            }

            $x = $modelElement->getEffectivePositionX();
            $y = $modelElement->getEffectivePositionY();
            $w = $modelElement->getEffectiveWidth();
            $h = $modelElement->getEffectiveHeight();
            $zIndex = (int) $modelElement->z_index;

            $html .= sprintf(
                '<div style="position: absolute; left: %.2fmm; top: %.2fmm; width: %.2fmm; height: %.2fmm; z-index: %d; margin: 0; padding: 0;"><img src="%s" style="width: %.2fmm; height: %.2fmm; display: block;" /></div>',
                $x,
                $y,
                $w,
                $h,
                $zIndex,
                htmlspecialchars($localPath, ENT_QUOTES, 'UTF-8'),
                $w,
                $h
            );
        }

        return $html;
    }
}
