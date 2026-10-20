<?php

declare(strict_types=1);

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

    $result = app(GenerateDocumentAction::class)->handle($model->id, ['nome' => 'Ana']);

    expect($result['pdf'])->toStartWith('%PDF-');
    expect($result['html'])->toBeString();
});

it('generates a clean A4 flowable pdf from html_content with institutional styling', function (): void {
    $user = User::factory()->create();
    $model = DocumentModel::create([
        'id' => (string) Illuminate\Support\Str::uuid(),
        'name' => 'Edital Minuta UNESC',
        'template_path' => null,
        'extracted_text' => '<p>EDITAL UNESC {{numero_edital}}</p>',
        'html_content' => '<div class="header"><h1>UNESC</h1></div><p>Edital de Seleção: {{objeto}}</p><table><tr><td>Item 1</td><td>R$ {{valor}}</td></tr></table>',
        'document_structure' => null,
        'fields' => [
            ['name' => 'Objeto', 'slug' => 'objeto', 'type' => 'text'],
            ['name' => 'Valor', 'slug' => 'valor', 'type' => 'text'],
        ],
        'user_id' => $user->id,
    ]);

    $result = app(GenerateDocumentAction::class)->handle($model->id, [
        'objeto' => 'Bolsas de Pesquisa 2026',
        'valor' => '1.500,00',
    ]);

    expect($result['pdf'])->toStartWith('%PDF-');
    expect($result['html'])->toContain('Bolsas de Pesquisa 2026');
    expect($result['html'])->toContain('R$ 1.500,00');
    expect($result['html'])->toContain('UNESC');
});

it('includes html_content and template_path in dashboard models for preview', function (): void {
    Spatie\Permission\Models\Role::findOrCreate('admin', 'web');
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole('admin');

    DocumentModel::create([
        'id' => (string) Illuminate\Support\Str::uuid(),
        'name' => 'Modelo de Teste',
        'template_path' => 'templates/test.pdf',
        'extracted_text' => '<p>Texto extraído</p>',
        'html_content' => '<p>HTML estruturado com {{campo}}</p>',
        'document_structure' => null,
        'fields' => [
            ['name' => 'Campo', 'slug' => 'campo', 'type' => 'text'],
        ],
        'user_id' => $user->id,
    ]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('customModels.0', fn ($model) => $model
                ->where('name', 'Modelo de Teste')
                ->where('html_content', '<p>HTML estruturado com {{campo}}</p>')
                ->etc()
            )
        );
});
