<?php

declare(strict_types=1);

use App\Actions\GenerateDocumentAction;
use App\Actions\ProcessDocumentTemplate;
use App\Models\DocumentModel;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mpdf\Mpdf;

it('extracts rich continuous document from digital pdf without ocr', function (): void {
    $digitalMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $digitalMpdf->WriteHTML('<h1>Contrato Digital Teste</h1><p>Contratante: {{nome}}</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_digital_').'.pdf';
    $digitalMpdf->Output($pdfPath, 'F');

    $action = app(ProcessDocumentTemplate::class);
    $result = $action->handle($pdfPath);

    expect($result)->toHaveKey('html')
        ->and($result['documentType'])->toBe('pdf_digital')
        ->and($result['isScanned'])->toBeFalse()
        ->and($result['isDocx'])->toBeFalse()
        ->and($result['html'])->toContain('Contrato Digital Teste')
        ->and($result['fieldsDetected'])->toContain('nome');

    @unlink($pdfPath);
});

it('extracts rich continuous document from scanned pdf using python ocr', function (): void {
    $sourceMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $sourceMpdf->WriteHTML('<div style="font-size: 24pt;">PETICAO INICIAL JURIDICA</div><p>Autor: {{autor}}</p>');
    $tempPdf = tempnam(sys_get_temp_dir(), 'test_src_').'.pdf';
    $sourceMpdf->Output($tempPdf, 'F');

    // Renderiza a página como imagem e insere em um PDF sem texto (simulando documento escaneado)
    $tempPrefix = tempnam(sys_get_temp_dir(), 'test_scanned_img_');
    exec("pdftoppm -png -r 150 -f 1 -l 1 {$tempPdf} {$tempPrefix}");
    $generatedPng = glob($tempPrefix.'*.png')[0] ?? null;

    expect($generatedPng)->not->toBeNull();

    $scannedMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4', 'margin_left' => 0, 'margin_right' => 0, 'margin_top' => 0, 'margin_bottom' => 0]);
    $scannedMpdf->AddPage();
    $scannedMpdf->Image($generatedPng, 0, 0, 210, 297, 'png', '', true, false);
    $scannedPdfPath = tempnam(sys_get_temp_dir(), 'scanned_doc_').'.pdf';
    $scannedMpdf->Output($scannedPdfPath, 'F');

    $action = app(ProcessDocumentTemplate::class);
    $result = $action->handle($scannedPdfPath);

    expect($result)->toHaveKey('html')
        ->and($result['isScanned'])->toBeTrue()
        ->and($result['documentType'])->toBe('pdf_scanned')
        ->and(mb_strtoupper($result['html']))->toContain('PETICAO');

    @unlink($tempPdf);
    @unlink($generatedPng);
    @unlink($scannedPdfPath);
});

it('processes docx files and generates filled document preserving layout and images', function (): void {
    Storage::fake('public');

    // 1. Criar imagem de logo
    $img = imagecreatetruecolor(100, 50);
    $blue = imagecolorallocate($img, 10, 30, 80);
    $white = imagecolorallocate($img, 255, 255, 255);
    imagefilledrectangle($img, 0, 0, 99, 49, $blue);
    imagestring($img, 3, 10, 15, 'OAB TESTE', $white);
    $logoPath = tempnam(sys_get_temp_dir(), 'logo_').'.png';
    imagepng($img, $logoPath);
    imagedestroy($img);

    // 2. Criar DOCX com imagem
    $docxPath = tempnam(sys_get_temp_dir(), 'doc_img_').'.docx';
    $zip = new ZipArchive();
    $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Default Extension="png" ContentType="image/png"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>');
    $zip->addFromString('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
    </Relationships>');
    $zip->addFile($logoPath, 'word/media/image1.png');
    $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <w:body>
            <w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="952500" cy="476250"/><wp:docPr id="1" name="Logo"/>
                <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Logo.png"/><pic:cNvPicPr/></pic:nvPicPr>
                        <pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                        <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="476250"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                    </pic:pic>
                </a:graphicData></a:graphic>
            </wp:inline></w:drawing></w:r></w:p>
            <w:p><w:r><w:t>CONTRATO: {{cliente}}</w:t></w:r></w:p>
        </w:body>
    </w:document>');
    $zip->close();

    // 3. Processar o DOCX
    $processor = app(ProcessDocumentTemplate::class);
    $result = $processor->handle($docxPath);

    expect($result['isDocx'])->toBeTrue()
        ->and($result['documentType'])->toBe('docx')
        ->and($result['html'])->toContain('data:image/png;base64')
        ->and($result['fieldsDetected'])->toContain('cliente');

    // 4. Salvar modelo no storage fake
    Storage::disk('public')->put('templates/test_contract.docx', file_get_contents($docxPath));
    $user = User::factory()->create();
    $model = DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Modelo DOCX com Imagem',
        'template_path' => 'templates/test_contract.docx',
        'extracted_text' => $result['html'],
        'document_structure' => null,
        'fields' => [
            [
                'id' => (string) Str::uuid(),
                'name' => 'Cliente',
                'slug' => 'cliente',
                'type' => 'text',
            ],
        ],
        'user_id' => $user->id,
    ]);

    // 5. Gerar PDF preenchido com reflow contínuo
    $generator = app(GenerateDocumentAction::class);
    $pdf = $generator->handle($model->id, ['cliente' => 'Mariana Souza']);

    expect($pdf)->toStartWith('%PDF-');

    // 6. Verificar se o PDF gerado preservou a imagem embutida
    $tempGenerated = tempnam(sys_get_temp_dir(), 'gen_').'.pdf';
    file_put_contents($tempGenerated, $pdf);
    $imageCheck = shell_exec("pdfimages -list {$tempGenerated}");
    expect($imageCheck)->toContain('image');

    @unlink($logoPath);
    @unlink($docxPath);
    @unlink($tempGenerated);
});

it('allows admin users to analyze document template via api endpoint', function (): void {
    Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin']);
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h1>Modelo de Teste API</h1><p>Cliente: {{nome_cliente}}</p>');
    $pdfContent = $mpdf->Output('', 'S');

    $file = UploadedFile::fake()->createWithContent('template.pdf', $pdfContent);

    $this->actingAs($admin)
        ->postJson(route('models.analyze'), [
            'template' => $file,
        ])
        ->assertOk()
        ->assertJsonStructure([
            'kind',
            'html',
            'fieldsDetected',
            'documentType',
            'isScanned',
            'isDocx',
        ])
        ->assertJson([
            'kind' => 'rich_document',
            'isScanned' => false,
            'isDocx' => false,
            'fieldsDetected' => ['nome_cliente'],
        ]);
});
