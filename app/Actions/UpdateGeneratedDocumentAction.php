<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use App\Models\GeneratedDocument;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

final readonly class UpdateGeneratedDocumentAction
{
    public function __construct(
        private GenerateDocumentAction $generateDocument,
        private GenerateSampleDocumentAction $generateSampleDocument,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(GeneratedDocument $document, array $data): GeneratedDocument
    {
        if (Str::isUuid($document->model_key)) {
            $model = DocumentModel::find($document->model_key);

            if (! $model instanceof DocumentModel) {
                throw new RuntimeException('O modelo original não está mais disponível para editar este documento.');
            }

            $generated = $this->generateDocument->handle($model->id, $data);
            $pdfContent = $generated['pdf'];
        } else {
            $pdfContent = $this->generateSampleDocument->handle($document->preview ?? [], $data);
        }

        if (! Storage::disk('local')->put($document->file_path, $pdfContent)) {
            throw new RuntimeException('Não foi possível atualizar o arquivo PDF.');
        }

        $document->update(['data' => $data]);

        return $document->refresh();
    }
}
