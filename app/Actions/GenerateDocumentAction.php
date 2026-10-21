<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\DocumentElementType;
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

        // Extrair configurações de margens e tipografia se presentes no HTML
        $marginTop = 30;
        $marginLeft = 30;
        $marginRight = 20;
        $marginBottom = 20;
        $fontFamily = "'Times New Roman', Times, serif";
        $lineHeight = '1.5';

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
            if (preg_match('/font="([^"]+)"/', $matches[1], $fontMatch)) {
                $fontFamily = $fontMatch[1];
            }
            if (preg_match('/lineHeight=([0-9.]+)/', $matches[1], $lhMatch)) {
                $lineHeight = $lhMatch[1];
            }
        }

        // Resolver cabeçalhos e rodapés institucionais via motor nativo de paginação do mPDF
        $headerFooterData = $this->resolveHeaderFooterData($model);

        // Ajustar margens superior e inferior dinamicamente para garantir buffer de segurança e evitar sobreposição
        if ($headerFooterData['maxHeaderHeight'] > 0) {
            $marginTop = (int) max($marginTop, ceil($headerFooterData['maxHeaderHeight'] + 5));
        }
        if ($headerFooterData['maxFooterHeight'] > 0) {
            $marginBottom = (int) max($marginBottom, ceil($headerFooterData['maxFooterHeight'] + 5));
        }

        // 1. Remover quebras <hr> legadas que duplicam a quebra da <div class="page-break">
        $cleanContent = preg_replace('/<hr[^>]*class=["\'][^"\']*page-break[^"\']*["\'][^>]*>/i', '', $content);

        // 2. Remover quebras de página automáticas do editor (que causam o efeito "double-break" no mPDF),
        // preservando apenas quebras manuais explicitamente inseridas pelo usuário.
        $cleanContent = (string) preg_replace_callback(
            '/(?:<hr[^>]*class=["\'][^"\']*page-break[^"\']*["\'][^>]*>|<div[^>]*class=["\'][^"\']*page-break[^"\']*["\'][^>]*>(?:\s*<\/div>)?|<(?:div|hr)[^>]*data-(?:manual|auto)-break=["\'][^"\']*["\'][^>]*>(?:\s*<\/(?:div|hr)>)?|<!--\s*(?:a4-)?(?:manual-)?page-break\s*-->)/i',
            static function (array $matches): string {
                $match = $matches[0];
                if (preg_match('/manual-page-break|data-manual-break=["\']true["\']|<!--\s*manual-page-break\s*-->/i', $match)) {
                    return '<div class="manual-page-break" style="page-break-after: always;"></div>';
                }

                return '';
            },
            (string) $cleanContent
        );

        // 3. Normalizar múltiplos parágrafos vazios consecutivos que possam ter se acumulado
        $cleanContent = (string) preg_replace('/(<p[^>]*>\s*(?:<br\s*\/?>|&nbsp;|\s*)*<\/p>\s*){3,}/i', '<p><br/></p>', $cleanContent);

        // Criar PDF com mPDF suportando estilos de documento oficial/jurídico, tabelas, imagens e reflow
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => $marginLeft,
            'margin_right' => $marginRight,
            'margin_top' => $marginTop,
            'margin_bottom' => $marginBottom,
            'margin_header' => 0,
            'margin_footer' => 0,
        ]);

        $pageHeaderFooterCss = '';
        if ($headerFooterData['hasElements']) {
            $pageHeaderFooterCss = '
            @page {
                header: html_HeaderAll;
                footer: html_FooterAll;
            }
            @page :first {
                header: html_HeaderFirst;
                footer: html_FooterFirst;
            }';
        }

        $styledHtml = '
        <style>
            '.$pageHeaderFooterCss.'
            body {
                font-family: '.$fontFamily.', "Times New Roman", Times, Georgia, serif;
                font-size: 12pt;
                color: #111827;
                line-height: '.$lineHeight.';
            }
            h1, h2, h3 {
                color: #0f172a;
                font-family: '.$fontFamily.', "Times New Roman", serif;
                margin-top: 14pt;
                margin-bottom: 8pt;
                page-break-after: avoid;
            }
            h1 { font-size: 16pt; text-align: center; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; font-weight: bold; }
            p {
                margin-top: 4.5pt;
                margin-bottom: 4.5pt;
                text-align: justify;
                line-height: '.$lineHeight.';
                orphans: 2;
                widows: 2;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 10pt 0;
                font-size: 10pt;
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
            }
            thead {
                display: table-header-group;
            }
            td, th {
                border: 1px solid #94a3b8;
                padding: 5pt 7pt;
                vertical-align: top;
            }
            img {
                max-width: 100%;
                height: auto;
                display: inline-block;
            }
            .manual-page-break {
                page-break-after: always;
            }
            .document-header {
                margin-bottom: 16pt;
                text-align: center;
                font-size: 10.5pt;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 8pt;
            }
            .document-footer {
                margin-top: 20pt;
                text-align: center;
                font-size: 9pt;
                color: #64748b;
                border-top: 1px solid #cbd5e1;
                padding-top: 8pt;
            }
            .citation-long {
                margin-left: 4.0cm;
                font-size: 10pt;
                line-height: 1.0;
                text-align: justify;
                margin-top: 8pt;
                margin-bottom: 8pt;
            }
        </style>
        '.($headerFooterData['hasElements'] ? '
        <htmlpageheader name="HeaderFirst">'.$headerFooterData['headerFirst'].'</htmlpageheader>
        <htmlpageheader name="HeaderAll">'.$headerFooterData['headerAll'].'</htmlpageheader>
        <htmlpagefooter name="FooterFirst">'.$headerFooterData['footerFirst'].'</htmlpagefooter>
        <htmlpagefooter name="FooterAll">'.$headerFooterData['footerAll'].'</htmlpagefooter>
        ' : '').'
        '.$cleanContent;

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

    /**
     * @return array{
     *     hasElements: bool,
     *     headerFirst: string,
     *     headerAll: string,
     *     footerFirst: string,
     *     footerAll: string,
     *     maxHeaderHeight: float,
     *     maxFooterHeight: float
     * }
     */
    private function resolveHeaderFooterData(DocumentModel $model): array
    {
        $data = [
            'hasElements' => false,
            'headerFirst' => '',
            'headerAll' => '',
            'footerFirst' => '',
            'footerAll' => '',
            'maxHeaderHeight' => 0.0,
            'maxFooterHeight' => 0.0,
        ];

        if ($model->modelElements->isEmpty()) {
            return $data;
        }

        foreach ($model->modelElements as $modelElement) {
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

            $appliesToFirst = $modelElement->appliesToPage(1);
            $appliesToSubsequent = (bool) $modelElement->repeat_all_pages || $modelElement->appliesToPage(2);

            $data['hasElements'] = true;

            if ($element->type === DocumentElementType::Header) {
                $bottom = $y + $h;
                if ($bottom > $data['maxHeaderHeight']) {
                    $data['maxHeaderHeight'] = $bottom;
                }

                $div = sprintf(
                    '<div style="position: absolute; left: %.2fmm; top: %.2fmm; width: %.2fmm; height: %.2fmm; z-index: %d;"><img src="%s" style="width: %.2fmm; height: %.2fmm; display: block;" /></div>',
                    $x,
                    $y,
                    $w,
                    $h,
                    $zIndex,
                    htmlspecialchars($localPath, ENT_QUOTES, 'UTF-8'),
                    $w,
                    $h
                );

                if ($appliesToFirst) {
                    $data['headerFirst'] .= $div;
                }
                if ($appliesToSubsequent) {
                    $data['headerAll'] .= $div;
                }
            } else {
                $distFromBottom = max(0.0, 297.0 - ($y + $h));
                $footerReach = max(0.0, 297.0 - $y);
                if ($footerReach > $data['maxFooterHeight']) {
                    $data['maxFooterHeight'] = $footerReach;
                }

                $div = sprintf(
                    '<div style="position: absolute; left: %.2fmm; bottom: %.2fmm; width: %.2fmm; height: %.2fmm; z-index: %d;"><img src="%s" style="width: %.2fmm; height: %.2fmm; display: block;" /></div>',
                    $x,
                    $distFromBottom,
                    $w,
                    $h,
                    $zIndex,
                    htmlspecialchars($localPath, ENT_QUOTES, 'UTF-8'),
                    $w,
                    $h
                );

                if ($appliesToFirst) {
                    $data['footerFirst'] .= $div;
                }
                if ($appliesToSubsequent) {
                    $data['footerAll'] .= $div;
                }
            }
        }

        return $data;
    }
}
