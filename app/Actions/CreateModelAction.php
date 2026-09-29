<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateModelAction
{
    public function __construct(private ConvertFileToHtmlAction $convertFileToHtml) {}

    public function handle(array $data, string $userId): DocumentModel
    {
        return DB::transaction(function () use ($data, $userId) {
            $templatePath = null;
            $htmlContent = null;

            if (isset($data['template']) && $data['template'] instanceof \Illuminate\Http\UploadedFile) {
                $templatePath = $data['template']->store('templates', 'public');
                $htmlContent = is_string($data['html_content'] ?? null)
                    && $data['html_content'] !== ''
                        ? $data['html_content']
                        : $this->convertFileToHtml->handle($data['template']);
            }

            return DocumentModel::create([
                'id' => Str::uuid(),
                'name' => $data['name'],
                'template_path' => $templatePath,
                'extracted_text' => $data['extracted_text'] ?? null,
                'html_content' => $htmlContent,
                'document_structure' => $data['document_structure'] ?? null,
                'fields' => $data['fields'],
                'user_id' => $userId,
            ]);
        });
    }
}
