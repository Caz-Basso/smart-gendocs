<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;

final readonly class GenerateDocumentAction
{
    public function handle(string $modelId, array $data): string
    {
        $model = DocumentModel::findOrFail($modelId);

        if ($model->document_structure !== null && $model->template_path !== null) {
            return $this->generateFromStructure($model, $data);
        }

        // Substituir os placeholders pelos dados
        $content = $model->extracted_text ?? '';

        foreach ($data as $key => $value) {
            $placeholder = '{{'.$key.'}}';
            $content = str_replace($placeholder, $value, $content);
        }

        // Criar PDF com configurações básicas
        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
        ]);

        // Processar conteúdo simples
        $cleanContent = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanContent = strip_tags($cleanContent);
        $cleanContent = mb_trim($cleanContent);

        // Escrever como texto simples
        $mpdf->WriteHTML($cleanContent);

        // Retornar o conteúdo do PDF
        return $mpdf->Output('', 'S');
    }

    /** @param array<string, mixed> $data */
    private function generateFromStructure(DocumentModel $model, array $data): string
    {
        $templatePath = Storage::disk('public')->path($model->template_path);

        if (! is_file($templatePath)) {
            throw new \RuntimeException('O PDF original deste modelo não foi encontrado.');
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
            throw new \RuntimeException('A estrutura salva não corresponde às páginas do PDF original.');
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
        }

        if ($pageCount > count($structure['pages'])) {
            for ($pageNumber = count($structure['pages']) + 1; $pageNumber <= $pageCount; $pageNumber++) {
                $mpdf->AddPage();
                $templateId = $mpdf->ImportPage($pageNumber);
                $mpdf->UseTemplate($templateId, 0, 0, null, null, true);
            }
        }

        return $mpdf->Output('', 'S');
    }
}
