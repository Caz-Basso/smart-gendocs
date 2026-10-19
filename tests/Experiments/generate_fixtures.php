<?php

declare(strict_types=1);

namespace Tests\Experiments;

use Mpdf\Mpdf;

require_once __DIR__.'/../../vendor/autoload.php';

$fixturesDir = __DIR__.'/fixtures';
if (! is_dir($fixturesDir)) {
    mkdir($fixturesDir, 0777, true);
}

// 1. Digital PDF com texto pesquisável
$digitalMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4']);
$digitalMpdf->WriteHTML('
    <div style="font-family: sans-serif; padding: 20px;">
        <h1 style="text-align: center; color: #1a365d;">CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</h1>
        <p style="margin-top: 30px;">Pelo presente instrumento particular, de um lado:</p>
        <p><strong>CONTRATANTE:</strong> {{nome_do_cliente}}, inscrito no CPF sob nº {{cpf_cliente}}.</p>
        <p><strong>CONTRATADO:</strong> {{nome_do_advogado}}, inscrito na OAB/SP sob nº {{oab_advogado}}.</p>
        <p style="margin-top: 20px;">As partes contratam o seguinte:</p>
        <p><strong>CLÁUSULA PRIMEIRA:</strong> O objeto deste contrato é a prestação de serviços na comarca de {{cidade}}.</p>
        <p><strong>CLÁUSULA SEGUNDA:</strong> Pelos serviços, o Contratante pagará a quantia de R$ {{valor_honorarios}}.</p>
        <p style="margin-top: 40px; text-align: right;">{{cidade}}, {{data_contrato}}.</p>
    </div>
');
$digitalPdfPath = $fixturesDir.'/contrato_digital.pdf';
$digitalMpdf->Output($digitalPdfPath, 'F');
echo "Fixture digital criada: {$digitalPdfPath}\n";

// 2. Scanned PDF (rasterizado: convertemos a página do digital em imagem PNG e colocamos em um PDF sem texto)
$pagePngPath = $fixturesDir.'/pagina_escaneada.png';
exec("pdftoppm -png -r 150 -f 1 -l 1 {$digitalPdfPath} {$fixturesDir}/scanned_page");
$generatedPng = glob($fixturesDir.'/scanned_page*.png')[0] ?? null;

if ($generatedPng && is_file($generatedPng)) {
    rename($generatedPng, $pagePngPath);
    $scannedMpdf = new Mpdf(['mode' => 'utf-8', 'format' => 'A4', 'margin_left' => 0, 'margin_right' => 0, 'margin_top' => 0, 'margin_bottom' => 0]);
    $scannedMpdf->AddPage();
    // Inserir a imagem ocupando a página inteira (simulando um PDF escaneado sem camada de texto)
    $scannedMpdf->Image($pagePngPath, 0, 0, 210, 297, 'png', '', true, false);
    $scannedPdfPath = $fixturesDir.'/contrato_escaneado.pdf';
    $scannedMpdf->Output($scannedPdfPath, 'F');
    echo "Fixture escaneada criada: {$scannedPdfPath}\n";
}

// 3. DOCX de teste simples (criado via LibreOffice ou zip XML se disponível)
// Criamos um HTML e convertemos para docx via LibreOffice
$htmlForDocx = $fixturesDir.'/contrato_temp.html';
file_put_contents($htmlForDocx, '
    <html><body>
    <h1 style="text-align: center;">PROCURAÇÃO AD JUDICIA ET EXTRA</h1>
    <p><strong>OUTORGANTE:</strong> {{nome_outorgante}}, residente em {{cidade}}.</p>
    <p><strong>OUTORGADO:</strong> {{nome_advogado}}, inscrito na OAB.</p>
    <p><strong>PODERES:</strong> Pelo presente instrumento, confere amplos poderes para o foro em geral.</p>
    </body></html>
');
exec("libreoffice --headless --convert-to docx {$htmlForDocx} --outdir {$fixturesDir}");
$docxPath = $fixturesDir.'/contrato_temp.docx';
if (is_file($docxPath)) {
    rename($docxPath, $fixturesDir.'/procuracao.docx');
    unlink($htmlForDocx);
    echo "Fixture DOCX criada: {$fixturesDir}/procuracao.docx\n";
}

echo "Fixtures geradas com sucesso!\n";
