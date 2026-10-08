<?php

declare(strict_types=1);

use App\Actions\GenerateDocumentAction;
use App\Actions\ProcessDocumentTemplate;
use App\Models\DocumentModel;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use Spatie\Permission\Models\Role;

it('completes the entire visual fidelity workflow from conversion to editor, saving, reloading and PDF generation', function (): void {
    Storage::fake('public');

    // 1. Arquivo original: cria um PDF com título oficial, parágrafo com recuo e tag dinâmica
    $sourceMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4', 'margin_left' => 30, 'margin_right' => 20, 'margin_top' => 30, 'margin_bottom' => 20]);
    $sourceMpdf->WriteHTML('<h1 style="text-align: center;">PORTARIA NORMATIVA Nº 42/2026</h1><p style="text-align: justify; text-indent: 1.25cm;">O Reitor da Instituição resolve designar {{nome_servidor}} para a comissão.</p>');
    $originalPdfContent = $sourceMpdf->Output('', 'S');

    $uploadedFile = UploadedFile::fake()->createWithContent('portaria.pdf', $originalPdfContent);

    // 2. Conversão estruturada preservando fidelidade ABNT
    $processor = app(ProcessDocumentTemplate::class);
    $conversionResult = $processor->handle($uploadedFile->getRealPath());

    expect($conversionResult['html'])->toContain('PORTARIA NORMATIVA')
        ->and($conversionResult['html'])->toContain('Times New Roman')
        ->and($conversionResult['fieldsDetected'])->toContain('nome_servidor');

    // 3. Simula edição no editor A4: alteração de conteúdo e aplicação de margens ABNT com cabeçalho
    $editorHtml = '<!-- a4-config: top=30 left=30 right=20 bottom=20 font="Times New Roman" lineHeight=1.5 -->'."\n".
        '<header class="document-header" style="text-align: center; margin-bottom: 18pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 8pt;"><p>REPÚBLICA FEDERATIVA DO BRASIL</p></header>'.
        '<h1 style="text-align: center; font-family: \'Times New Roman\', serif; font-size: 16pt;">PORTARIA NORMATIVA Nº 42/2026</h1>'.
        '<p style="text-align: justify; line-height: 1.5; font-family: \'Times New Roman\', serif; font-size: 12pt; text-indent: 1.25cm; margin-bottom: 6pt;">O Reitor resolve designar {{nome_servidor}} para atuar como presidente da banca oficial.</p>'.
        '<footer class="document-footer" style="text-align: center; margin-top: 20pt; border-top: 1px solid #cbd5e1; padding-top: 8pt;"><p>Publicado no Diário Oficial</p></footer>';

    // 4. Salvamento: criação do modelo via requisição autenticada
    Role::findOrCreate('admin', 'web');
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole('admin');

    $this->actingAs($user)
        ->post(route('models.store'), [
            'name' => 'Portaria Oficial 2026',
            'fields' => [
                [
                    'id' => (string) str()->uuid(),
                    'name' => 'Nome do Servidor',
                    'slug' => 'nome_servidor',
                    'type' => 'text',
                ],
            ],
            'extracted_text' => $editorHtml,
        ])
        ->assertRedirect(route('models.index'));

    $savedModel = DocumentModel::where('name', 'Portaria Oficial 2026')->firstOrFail();

    // 5. Carregamento posterior: verifica se o documento mantém os estilos, cabeçalhos, rodapés e margens
    expect($savedModel->extracted_text)->toBe($editorHtml)
        ->and($savedModel->extracted_text)->toContain('a4-config: top=30 left=30 right=20 bottom=20')
        ->and($savedModel->extracted_text)->toContain('REPÚBLICA FEDERATIVA DO BRASIL')
        ->and($savedModel->extracted_text)->toContain('text-indent: 1.25cm');

    // 6. Carregamento na tela de edição e dashboard
    $this->actingAs($user)
        ->get(route('models.edit', $savedModel->id))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('model-edit')
            ->where('model.extracted_text', $editorHtml)
        );

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('customModels.0.extracted_text')
            ->where('customModels.0.extracted_text', $editorHtml)
        );

    // 7. Geração de PDF oficial respeitando as margens ABNT configuradas e substituição de dados
    $generator = app(GenerateDocumentAction::class);
    $generatedPdf = $generator->handle($savedModel->id, [
        'nome_servidor' => 'Carlos Eduardo Silva',
    ]);

    expect($generatedPdf)->toStartWith('%PDF-')
        ->and(mb_strlen($generatedPdf))->toBeGreaterThan(1000);
});
