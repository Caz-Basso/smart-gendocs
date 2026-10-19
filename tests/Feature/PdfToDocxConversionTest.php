<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Actions\ConvertPdfToDocx;
use App\Actions\CreateModelAction;
use App\Actions\GenerateDocumentAction;
use App\Actions\ProcessDocumentTemplate;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use RuntimeException;
use ZipArchive;

beforeEach(function (): void {
    Storage::fake('public');
});

// 1. PDF válido com texto selecionável
it('converts a valid selectable text PDF to DOCX preserving paragraphs and text', function (): void {
    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h1>Edital de Concurso Público</h1><p>O presente edital destina-se ao preenchimento de vagas na comarca de {{cidade}}.</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_digital_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and(file_exists($result['docxPath']))->toBeTrue()
        ->and(filesize($result['docxPath']))->toBeGreaterThan(0)
        ->and($result['isScanned'])->toBeFalse()
        ->and($result['pageCount'])->toBe(1)
        ->and($result['paragraphsCount'])->toBeGreaterThan(0);

    // Valida que o DOCX gerado é um arquivo OpenXML válido
    $zip = new ZipArchive();
    expect($zip->open($result['docxPath']))->toBeTrue();
    $docXml = $zip->getFromName('word/document.xml');
    expect($docXml)->toBeString()
        ->and($docXml)->toContain('Edital de Concurso')
        ->and($docXml)->toContain('cidade');
    $zip->close();

    @unlink($pdfPath);
    @unlink($result['docxPath']);
});

// 2. PDF com várias páginas
it('converts a multi-page PDF to DOCX keeping page count and flow', function (): void {
    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h2>Página 1: Preâmbulo</h2><p>Conteúdo da primeira página.</p>');
    $mpdf->AddPage();
    $mpdf->WriteHTML('<h2>Página 2: Das Obrigações</h2><p>Conteúdo da segunda página.</p>');
    $mpdf->AddPage();
    $mpdf->WriteHTML('<h2>Página 3: Do Foro</h2><p>Conteúdo da terceira página.</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_multipage_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and($result['pageCount'])->toBe(3)
        ->and(file_exists($result['docxPath']))->toBeTrue();

    $zip = new ZipArchive();
    $zip->open($result['docxPath']);
    $docXml = $zip->getFromName('word/document.xml');
    expect($docXml)->toContain('Página 1')
        ->and($docXml)->toContain('Página 2')
        ->and($docXml)->toContain('Página 3');
    $zip->close();

    @unlink($pdfPath);
    @unlink($result['docxPath']);
});

// 3. PDF contendo tabelas
it('converts a PDF containing tables and preserves table structure in DOCX', function (): void {
    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('
        <h1>Tabela de Preços e Itens</h1>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr><th>Lote</th><th>Especificação</th><th>Valor</th></tr>
            </thead>
            <tbody>
                <tr><td>1</td><td>Licenciamento de Software</td><td>{{valor_software}}</td></tr>
                <tr><td>2</td><td>Consultoria Técnica</td><td>R$ 5.000,00</td></tr>
            </tbody>
        </table>
    ');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_table_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and($result['tablesCount'])->toBeGreaterThanOrEqual(1);

    $zip = new ZipArchive();
    $zip->open($result['docxPath']);
    $docXml = $zip->getFromName('word/document.xml');
    expect($docXml)->toContain('<w:tbl')
        ->and($docXml)->toContain('Licenciamento de Software')
        ->and($docXml)->toContain('valor_software');
    $zip->close();

    @unlink($pdfPath);
    @unlink($result['docxPath']);
});

// 4. PDF contendo imagens
it('converts a PDF containing embedded images into DOCX', function (): void {
    $img = imagecreatetruecolor(120, 60);
    $bg = imagecolorallocate($img, 20, 60, 140);
    imagefilledrectangle($img, 0, 0, 119, 59, $bg);
    $imgPath = tempnam(sys_get_temp_dir(), 'test_img_').'.png';
    imagepng($img, $imgPath);
    imagedestroy($img);

    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h1>Documento com Brasão</h1><p><img src="'.$imgPath.'" width="120" height="60" /></p><p>Texto abaixo da imagem.</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_pdf_img_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and(file_exists($result['docxPath']))->toBeTrue();

    $zip = new ZipArchive();
    $zip->open($result['docxPath']);
    $hasImageInDocx = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        if (str_starts_with($zip->getNameIndex($i), 'word/media/')) {
            $hasImageInDocx = true;
            break;
        }
    }
    expect($hasImageInDocx)->toBeTrue();
    $zip->close();

    @unlink($imgPath);
    @unlink($pdfPath);
    @unlink($result['docxPath']);
});

// 5. PDF com textos longos
it('converts a PDF with long narrative text preserving flow and paragraphs', function (): void {
    $paragraphs = [];
    for ($i = 1; $i <= 15; $i++) {
        $paragraphs[] = "<p><strong>Cláusula {$i}ª:</strong> Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>";
    }

    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h1>Contrato Administrativo Extenso</h1>'.implode('', $paragraphs));
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_long_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and($result['paragraphsCount'])->toBeGreaterThanOrEqual(15);

    @unlink($pdfPath);
    @unlink($result['docxPath']);
});

// 6. PDF digitalizado com OCR
it('converts a scanned PDF using Tesseract OCR into a readable DOCX', function (): void {
    $fixturePath = base_path('tests/Experiments/fixtures/contrato_escaneado.pdf');
    expect(file_exists($fixturePath))->toBeTrue();

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($fixturePath);

    expect($result['success'])->toBeTrue()
        ->and($result['isScanned'])->toBeTrue()
        ->and($result['conversionMode'])->toBe('ocr')
        ->and(file_exists($result['docxPath']))->toBeTrue();

    $zip = new ZipArchive();
    $zip->open($result['docxPath']);
    $docXml = $zip->getFromName('word/document.xml');
    expect(mb_strtoupper($docXml))->toContain('HONOR');
    $zip->close();

    @unlink($result['docxPath']);
});

// 7. Arquivo corrompido
it('rejects a corrupted PDF file and throws descriptive exception', function (): void {
    $corruptPath = tempnam(sys_get_temp_dir(), 'test_corrupt_').'.pdf';
    file_put_contents($corruptPath, '%PDF-1.5 this file is completely corrupted and cannot be parsed');

    $action = app(ConvertPdfToDocx::class);

    expect(fn () => $action->handle($corruptPath))
        ->toThrow(RuntimeException::class, 'corrompido');

    @unlink($corruptPath);
});

// 8. Arquivo que não seja PDF
it('rejects a non-PDF file and throws descriptive exception', function (): void {
    $fakePdf = tempnam(sys_get_temp_dir(), 'fake_').'.pdf';
    file_put_contents($fakePdf, 'This is a text file with a .pdf extension.');

    $action = app(ConvertPdfToDocx::class);

    expect(fn () => $action->handle($fakePdf))
        ->toThrow(RuntimeException::class, 'não é um documento PDF válido');

    @unlink($fakePdf);
});

// 9. PDF protegido por senha
it('identifies password protected PDFs and raises proper warning/exception', function (): void {
    $sourceMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $sourceMpdf->SetProtection(['print'], 'userpassword123', 'ownerpassword123');
    $sourceMpdf->WriteHTML('<h1>Documento Confidencial</h1>');
    $protectedPath = tempnam(sys_get_temp_dir(), 'test_protected_').'.pdf';
    $sourceMpdf->Output($protectedPath, 'F');

    $action = app(ConvertPdfToDocx::class);

    expect(fn () => $action->handle($protectedPath))
        ->toThrow(RuntimeException::class, 'protegido por senha');

    @unlink($protectedPath);
});

// 10. PDF vazio (0 bytes)
it('rejects an empty PDF file', function (): void {
    $emptyPath = tempnam(sys_get_temp_dir(), 'test_empty_').'.pdf';
    file_put_contents($emptyPath, '');

    $action = app(ConvertPdfToDocx::class);

    expect(fn () => $action->handle($emptyPath))
        ->toThrow(RuntimeException::class, 'vazio');

    @unlink($emptyPath);
});

// 11. Falha durante a conversão / caminho inexistente
it('throws an exception if the input file does not exist', function (): void {
    $action = app(ConvertPdfToDocx::class);

    expect(fn () => $action->handle('/tmp/non_existent_file_xyz_123.pdf'))
        ->toThrow(RuntimeException::class, 'não encontrado');
});

// 12. DOCX gerado que possa ser aberto e editado
it('produces a real DOCX that can be opened, modified and saved with python-docx/zip', function (): void {
    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<p>Contrato de Prestação de Serviços - Teste de Edição</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'test_editable_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    $docxPath = $result['docxPath'];
    expect(file_exists($docxPath))->toBeTrue();

    // Testa reabertura e edição do DOCX via PHP ZipArchive
    $zip = new ZipArchive();
    expect($zip->open($docxPath))->toBeTrue();
    $docXml = $zip->getFromName('word/document.xml');
    $modifiedXml = str_replace('Teste de Edição', 'Teste Editado com Sucesso', $docXml);
    $zip->addFromString('word/document.xml', $modifiedXml);
    $zip->close();

    $zip2 = new ZipArchive();
    $zip2->open($docxPath);
    expect($zip2->getFromName('word/document.xml'))->toContain('Teste Editado com Sucesso');
    $zip2->close();

    @unlink($pdfPath);
    @unlink($docxPath);
});

// 13. Integração com o editor existente (/modelos/analisar e ProcessDocumentTemplate)
it('integrates PDF conversion seamlessly into ProcessDocumentTemplate and /modelos/analisar', function (): void {
    \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('admin');

    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h2>Contrato via Endpoint</h2><p>Contratante: {{nome_cliente}}</p>');
    $pdfContent = $mpdf->Output('', 'S');

    $uploadedFile = UploadedFile::fake()->createWithContent('contrato_teste.pdf', $pdfContent);

    $response = $this->actingAs($user)->postJson('/modelos/analisar', [
        'template' => $uploadedFile,
    ]);

    $response->assertOk()
        ->assertJson([
            'kind' => 'rich_document',
            'isScanned' => false,
            'isDocx' => false,
            'wasConvertedFromPdf' => true,
        ]);

    $json = $response->json();
    expect($json['html'])->toContain('Contrato via Endpoint')
        ->and($json['fieldsDetected'])->toContain('nome_cliente');
});

// 14. Salvamento de modelo a partir de PDF e geração posterior do PDF final
it('saves a model from uploaded PDF as a real DOCX and generates the final PDF successfully', function (): void {
    $user = User::factory()->create();

    $mpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
    $mpdf->WriteHTML('<h1>Minuta de Contrato</h1><p>O contratante {{nome}} pagará o valor de {{valor}}.</p>');
    $pdfPath = tempnam(sys_get_temp_dir(), 'model_save_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $uploadedFile = new UploadedFile($pdfPath, 'minuta.pdf', 'application/pdf', null, true);

    $createModel = app(CreateModelAction::class);
    $model = $createModel->handle([
        'name' => 'Modelo Importado de PDF',
        'template' => $uploadedFile,
        'extracted_text' => '<h1>Minuta de Contrato</h1><p>O contratante {{nome}} pagará o valor de {{valor}}.</p>',
        'fields' => [
            ['id' => '1', 'name' => 'Nome', 'slug' => 'nome', 'type' => 'text'],
            ['id' => '2', 'name' => 'Valor', 'slug' => 'valor', 'type' => 'text'],
        ],
    ], (string) $user->id);

    // O template salvo deve agora ser um DOCX!
    expect($model->template_path)->toEndWith('.docx')
        ->and(Storage::disk('public')->exists($model->template_path))->toBeTrue()
        ->and(Storage::disk('public')->exists($model->template_path.'.converted.pdf'))->toBeTrue();

    // Geração do documento preenchido com dados reais
    $generateDocument = app(GenerateDocumentAction::class);
    $generatedPdf = $generateDocument->handle((string) $model->id, [
        'nome' => 'Dr. Carlos Eduardo',
        'valor' => 'R$ 10.000,00',
    ]);

    expect($generatedPdf)->toBeString()
        ->and($generatedPdf)->toStartWith('%PDF-')
        ->and(mb_strlen($generatedPdf))->toBeGreaterThan(1000);

    @unlink($pdfPath);
});

// 15. Compatibilidade com modelos DOCX já existentes
it('maintains backwards compatibility with standard DOCX templates without alteration', function (): void {
    $user = User::factory()->create();

    $docxPath = tempnam(sys_get_temp_dir(), 'doc_test_').'.docx';
    $zip = new ZipArchive();
    $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    $zip->addFromString('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Modelo DOCX Nativo: {{campo_docx}}</w:t></w:r></w:p></w:body></w:document>');
    $zip->close();

    $uploadedFile = new UploadedFile($docxPath, 'nativo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);

    $process = app(ProcessDocumentTemplate::class);
    $analyzed = $process->handle($uploadedFile);

    expect($analyzed['isDocx'])->toBeTrue()
        ->and($analyzed['documentType'])->toBe('docx')
        ->and($analyzed['fieldsDetected'])->toContain('campo_docx');

    $createModel = app(CreateModelAction::class);
    $model = $createModel->handle([
        'name' => 'Modelo DOCX Nativo',
        'template' => $uploadedFile,
        'extracted_text' => $analyzed['html'],
        'fields' => [
            ['id' => '1', 'name' => 'Campo DOCX', 'slug' => 'campo_docx', 'type' => 'text'],
        ],
    ], (string) $user->id);

    expect($model->template_path)->toEndWith('.docx');

    @unlink($docxPath);
});

// 16. Ignora cabeçalhos e rodapés do PDF original preservando o corpo do documento e tags
it('ignores original PDF headers and footers during conversion while strictly preserving clauses and tags', function (): void {
    $mpdf = new Mpdf([
        'mode' => 'utf-8',
        'format' => 'A4',
        'margin_header' => 5,
        'margin_footer' => 5,
        'margin_top' => 30,
        'margin_bottom' => 25,
    ]);

    // Configura cabeçalho e rodapé institucionais no PDF original
    $mpdf->SetHTMLHeader('<div style="text-align: center; font-size: 8pt; border-bottom: 1px solid #ccc;">UNIVERSIDADE DO EXTREMO SUL CATARINENSE - UNESC | GABINETE DA REITORIA</div>');
    $mpdf->SetHTMLFooter('<div style="text-align: center; font-size: 8pt; border-top: 1px solid #ccc;">Av. Universitária, 1105 - Bairro Universitário - Criciúma/SC - Página {PAGENO} de {nbpg}</div>');

    $mpdf->WriteHTML('
        <h1>EDITAL DE PREGÃO ELETRÔNICO Nº 001/2026</h1>
        <p><strong>Cláusula Primeira:</strong> O presente processo licitatório tem por objeto a contratação de {{servico_licitado}}.</p>
        <p><strong>Cláusula Segunda:</strong> O valor estimado da contratação é de {{valor_estimado}}.</p>
    ');

    $pdfPath = tempnam(sys_get_temp_dir(), 'test_header_footer_').'.pdf';
    $mpdf->Output($pdfPath, 'F');

    $action = app(ConvertPdfToDocx::class);
    $result = $action->handle($pdfPath);

    expect($result['success'])->toBeTrue()
        ->and($result['headersFootersIgnored'])->toBeTrue()
        ->and($result['headersFootersCount'])->toBeGreaterThanOrEqual(1);

    $zip = new ZipArchive();
    $zip->open($result['docxPath']);
    $docXml = $zip->getFromName('word/document.xml');

    // O corpo e as tags devem estar intactos
    expect($docXml)->toContain('EDITAL DE PREGÃO')
        ->and($docXml)->toContain('Cláusula Primeira')
        ->and($docXml)->toContain('servico_licitado')
        ->and($docXml)->toContain('valor_estimado');

    // Cabeçalho e rodapé repetitivos do PDF original foram suprimidos/ignorados
    expect($docXml)->not->toContain('GABINETE DA REITORIA')
        ->and($docXml)->not->toContain('Av. Universitária');

    $zip->close();
    @unlink($pdfPath);
    @unlink($result['docxPath']);
});
