<?php

use App\Actions\GenerateDocumentAction;
use App\Models\DocumentModel;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;

it('generates a filled pdf using the original pages and saved document structure', function (): void {
    Storage::fake('public');

    $source = new Mpdf(['format' => 'A4']);
    $source->WriteHTML('<h1>Modelo original</h1>');
    Storage::disk('public')->put('templates/original.pdf', $source->Output('', 'S'));

    $user = User::factory()->create();
    $model = DocumentModel::create([
        'id' => (string) Illuminate\Support\Str::uuid(),
        'name' => 'Modelo estruturado',
        'template_path' => 'templates/original.pdf',
        'extracted_text' => null,
        'document_structure' => [
            'version' => 1,
            'pages' => [[
                'width' => 595,
                'height' => 842,
                'elements' => [[
                    'x' => 0.1,
                    'y' => 0.1,
                    'width' => 0.3,
                    'height' => 0.02,
                    'fontSize' => 12,
                    'text' => 'Olá {{nome}}',
                ]],
            ]],
        ],
        'fields' => [],
        'user_id' => $user->id,
    ]);

    $pdf = app(GenerateDocumentAction::class)->handle($model->id, ['nome' => 'Ana']);

    expect($pdf)->toStartWith('%PDF-');
});
