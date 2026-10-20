<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use App\Models\GeneratedDocument;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final readonly class StoreGeneratedDocumentAction
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>|null  $preview
     * @param  array<int, array<string, mixed>>  $fields
     */
    public function handle(
        User $user,
        ?DocumentModel $model,
        string $modelKey,
        string $name,
        array $data,
        ?array $preview,
        array $fields,
        string $pdfContent,
        ?string $htmlContent = null,
    ): GeneratedDocument {
        $id = (string) Str::uuid();
        $filePath = 'generated-documents/'.$user->id.'/'.$id.'.pdf';

        if (! Storage::disk('local')->put($filePath, $pdfContent)) {
            throw new RuntimeException('Não foi possível salvar o documento gerado.');
        }

        try {
            return DB::transaction(fn (): GeneratedDocument => GeneratedDocument::create([
                'id' => $id,
                'user_id' => $user->id,
                'document_model_id' => $model?->id,
                'model_key' => $modelKey,
                'name' => $name,
                'data' => $data,
                'preview' => $preview,
                'fields' => $fields,
                'file_path' => $filePath,
                'html_content' => $htmlContent,
            ]));
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($filePath);
            throw $exception;
        }
    }
}
