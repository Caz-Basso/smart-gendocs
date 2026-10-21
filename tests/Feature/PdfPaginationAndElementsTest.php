<?php

declare(strict_types=1);

use App\Actions\GenerateDocumentAction;
use App\Enums\DocumentElementType;
use App\Models\DocumentElement;
use App\Models\DocumentModel;
use App\Models\DocumentModelElement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

it('places institutional headers and footers natively on all pages and avoids double breaks', function (): void {
    Storage::fake('public');

    $user = User::factory()->create(['is_active' => true]);

    // Cria elemento de cabeçalho
    $headerImage = UploadedFile::fake()->image('header.png', 400, 100);
    $headerPath = $headerImage->store('elements', 'public');
    $headerElement = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Cabeçalho Teste',
        'type' => DocumentElementType::Header,
        'image_path' => $headerPath,
        'width' => 44.0,
        'height' => 35.0,
        'position_x' => 0.0,
        'position_y' => 0.0,
        'is_active' => true,
        'user_id' => $user->id,
    ]);

    // Cria elemento de rodapé
    $footerImage = UploadedFile::fake()->image('footer.png', 800, 200);
    $footerPath = $footerImage->store('elements', 'public');
    $footerElement = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Rodapé Teste',
        'type' => DocumentElementType::Footer,
        'image_path' => $footerPath,
        'width' => 98.4,
        'height' => 41.6,
        'position_x' => 0.0,
        'position_y' => 255.4,
        'is_active' => true,
        'user_id' => $user->id,
    ]);

    // Conteúdo com texto longo e quebra automática do editor
    $paragraphs = '';
    for ($i = 1; $i <= 30; $i++) {
        $paragraphs .= "<p>Parágrafo {$i}: Este é um texto oficial da instituição UNESC contendo informações necessárias sobre o contrato de prestação de serviços educacionais, assegurando clareza, validade jurídica e conformidade com as normas ABNT vigentes.</p>\n";
        if ($i === 15) {
            // Simula quebra automática inserida pelo editor do cliente
            $paragraphs .= '<div class="page-break auto-page-break" data-auto-break="true" style="page-break-after: always;"></div>'."\n";
        }
    }

    $model = DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Contrato com Paginação Nativa',
        'extracted_text' => $paragraphs,
        'fields' => [],
        'user_id' => $user->id,
    ]);

    DocumentModelElement::create([
        'id' => (string) Str::uuid(),
        'document_model_id' => $model->id,
        'document_element_id' => $headerElement->id,
        'position_x' => 0.0,
        'position_y' => 0.0,
        'width' => 44.0,
        'height' => 35.0,
        'repeat_all_pages' => true,
        'pages' => [],
        'z_index' => 10,
    ]);

    DocumentModelElement::create([
        'id' => (string) Str::uuid(),
        'document_model_id' => $model->id,
        'document_element_id' => $footerElement->id,
        'position_x' => 0.0,
        'position_y' => 255.4,
        'width' => 98.4,
        'height' => 41.6,
        'repeat_all_pages' => true,
        'pages' => [],
        'z_index' => 10,
    ]);

    $action = app(GenerateDocumentAction::class);
    $pdf = $action->handle($model->id, []);

    expect($pdf)->toStartWith('%PDF-');

    $tempPdfPath = tempnam(sys_get_temp_dir(), 'test_doc_').'.pdf';
    file_put_contents($tempPdfPath, $pdf);

    // Inspeciona o PDF gerado usando PyMuPDF
    $inspectionOutput = shell_exec(sprintf(
        'python3 -c %s',
        escapeshellarg('
import pymupdf, sys
doc = pymupdf.open("'.$tempPdfPath.'")
page_count = len(doc)
print(f"PAGES:{page_count}")
for i, page in enumerate(doc):
    imgs = len(page.get_images())
    text = len(page.get_text().strip())
    print(f"P{i+1}:IMGS={imgs}:CHARS={text}")
')
    ));

    @unlink($tempPdfPath);

    expect($inspectionOutput)->toContain('PAGES:')
        ->and($inspectionOutput)->toContain('P1:IMGS=2')
        ->and($inspectionOutput)->toContain('P2:IMGS=2');

    // Nenhuma página deve ter 0 caracteres de texto (sem páginas em branco)
    expect($inspectionOutput)->not->toContain(':CHARS=0');
});

it('preserves manual page breaks while removing auto page breaks', function (): void {
    $user = User::factory()->create(['is_active' => true]);

    $content = '<p>Página 1 conteúdo.</p>'
        .'<div class="page-break manual-page-break" data-manual-break="true" style="page-break-after: always;"></div>'
        .'<p>Página 2 conteúdo.</p>'
        .'<div class="page-break auto-page-break" data-auto-break="true" style="page-break-after: always;"></div>'
        .'<p>Página 2 continuação sem quebra forçada dupla.</p>';

    $model = DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Teste Quebra Manual',
        'extracted_text' => $content,
        'fields' => [],
        'user_id' => $user->id,
    ]);

    $action = app(GenerateDocumentAction::class);
    $pdf = $action->handle($model->id, []);

    expect($pdf)->toStartWith('%PDF-');

    $tempPdfPath = tempnam(sys_get_temp_dir(), 'test_mb_').'.pdf';
    file_put_contents($tempPdfPath, $pdf);

    $inspectionOutput = shell_exec(sprintf(
        'python3 -c %s',
        escapeshellarg('
import pymupdf
doc = pymupdf.open("'.$tempPdfPath.'")
print(f"PAGES:{len(doc)}")
for i, page in enumerate(doc):
    print(f"P{i+1}:{page.get_text().strip()}")
')
    ));

    @unlink($tempPdfPath);

    expect($inspectionOutput)->toContain('PAGES:2')
        ->and($inspectionOutput)->toContain('P1:Página 1 conteúdo.')
        ->and($inspectionOutput)->toContain('Página 2 conteúdo.')
        ->and($inspectionOutput)->toContain('Página 2 continuação');
});

