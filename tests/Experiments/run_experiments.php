<?php

declare(strict_types=1);

namespace Tests\Experiments;

use App\Actions\GenerateDocumentAction;
use App\Models\DocumentModel;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

require_once __DIR__.'/../../vendor/autoload.php';

$app = require_once __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$fixturesDir = __DIR__.'/fixtures';
$convertedPdfPath = $fixturesDir.'/contrato_com_imagem.docx.converted.pdf';

if (! file_exists($convertedPdfPath)) {
    echo "Execute a conversão primeiro!\n";
    exit(1);
}

// 1. Armazena no storage fake/public
$templateStoragePath = 'templates/contrato_com_imagem.docx.converted.pdf';
Storage::disk('public')->put($templateStoragePath, file_get_contents($convertedPdfPath));

// 2. Cria DocumentModel no banco
$user = User::first() ?? User::factory()->create();
$model = DocumentModel::create([
    'id' => (string) Str::uuid(),
    'name' => 'Contrato DOCX Teste Integrado',
    'template_path' => $templateStoragePath,
    'extracted_text' => null,
    'document_structure' => [
        'version' => 1,
        'pages' => [[
            'width' => 612.0,
            'height' => 792.0,
            'elements' => [
                [
                    'x' => 0.1178,
                    'y' => 0.1914,
                    'width' => 0.5037,
                    'height' => 0.0169,
                    'fontSize' => 12.1,
                    'text' => 'CONTRATANTE: {{nome_do_cliente}}, portador do CPF {{cpf_cliente}}.',
                    'originalText' => 'CONTRATANTE: {{nome_do_cliente}}, portador do CPF {{cpf_cliente}}.',
                ],
                [
                    'x' => 0.1178,
                    'y' => 0.2084,
                    'width' => 0.3714,
                    'height' => 0.0169,
                    'fontSize' => 12.1,
                    'text' => 'VALOR ACORDADO: R$ {{valor_honorarios}} a vista.',
                    'originalText' => 'VALOR ACORDADO: R$ {{valor_honorarios}} a vista.',
                ],
            ],
        ]],
    ],
    'fields' => [],
    'user_id' => $user->id,
]);

// 3. Executa a geração do documento preenchido
$action = app(GenerateDocumentAction::class);
$pdfContent = $action->handle($model->id, [
    'nome_do_cliente' => 'Carlos Silva',
    'cpf_cliente' => '123.456.789-00',
    'valor_honorarios' => '5.000,00',
]);

$outputPath = $fixturesDir.'/resultado_gerado_com_imagem.pdf';
file_put_contents($outputPath, $pdfContent);
echo "PDF final gerado com sucesso em: {$outputPath} (".mb_strlen($pdfContent)." bytes)\n";

// 4. Verifica se a imagem ainda está dentro do PDF gerado!
$imageInfo = shell_exec("pdfimages -list {$outputPath}");
echo "Imagens presentes no PDF gerado:\n{$imageInfo}\n";
