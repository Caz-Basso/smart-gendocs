<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateModelAction
{
    public function handle(array $data, string $userId): DocumentModel
    {
        return DB::transaction(function () use ($data, $userId) {
            $templatePath = null;

            if (isset($data['template']) && $data['template'] instanceof \Illuminate\Http\UploadedFile) {
                $templatePath = $data['template']->store('templates', 'public');

                if (str_ends_with(mb_strtolower($templatePath), '.docx')) {
                    $fullPath = \Illuminate\Support\Facades\Storage::disk('public')->path($templatePath);
                    $outputDir = dirname($fullPath);
                    \Illuminate\Support\Facades\Process::timeout(120)->run([
                        'libreoffice',
                        '--headless',
                        '--convert-to',
                        'pdf',
                        '--outdir',
                        $outputDir,
                        $fullPath,
                    ]);
                    $defaultConverted = $outputDir.'/'.pathinfo($fullPath, PATHINFO_FILENAME).'.pdf';
                    $targetConverted = $fullPath.'.converted.pdf';
                    if (is_file($defaultConverted) && $defaultConverted !== $targetConverted) {
                        rename($defaultConverted, $targetConverted);
                    }
                }
            }

            return DocumentModel::create([
                'id' => Str::uuid(),
                'name' => $data['name'],
                'template_path' => $templatePath,
                'extracted_text' => $data['extracted_text'] ?? null,
                'document_structure' => $data['document_structure'] ?? null,
                'fields' => $data['fields'],
                'user_id' => $userId,
            ]);
        });
    }
}
