<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Mpdf\Mpdf;

final readonly class GenerateDocumentAction
{
    public function handle(string $modelId, array $data): string
    {
        $model = DocumentModel::findOrFail($modelId);

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
}
