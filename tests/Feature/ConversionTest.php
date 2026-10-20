<?php

declare(strict_types=1);

use App\Actions\ConvertFileToHtmlAction;
use App\Actions\ConvertHtmlToPdfAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

test('convert docx to html', function () {
    Storage::fake('public');

    $action = app(ConvertFileToHtmlAction::class);

    $file = UploadedFile::fake()->create('document.docx', 1000);

    $html = $action->handle($file);

    expect($html)->toBeString();
    expect($html)->not->toBeEmpty();
});

test('converts pdf to html using doc-engine microservice', function () {
    config()->set('services.doc_engine.url', 'http://doc-engine:8000');

    Http::fake([
        'http://doc-engine:8000/analyze' => Http::response([
            'status' => 'success',
            'pages_count' => 1,
            'pages' => [
                [
                    'page_number' => 1,
                    'header' => '<p>UNESC - Cabeçalho</p>',
                    'body' => '<p>Edital 001/2026</p>',
                    'footer' => '<p>Página 1</p>',
                    'tables' => [],
                ],
            ],
            'html' => '<div class="pdf-page"><div class="pdf-header"><p>UNESC - Cabeçalho</p></div><div class="pdf-body"><p>Edital 001/2026</p></div><div class="pdf-footer"><p>Página 1</p></div></div>',
        ]),
    ]);

    $action = app(ConvertFileToHtmlAction::class);
    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $html = $action->handle($file);

    expect($html)->toContain('UNESC - Cabeçalho');
    expect($html)->toContain('Edital 001/2026');

    Http::assertSent(function (Illuminate\Http\Client\Request $request): bool {
        return $request->url() === 'http://doc-engine:8000/analyze'
            && $request->isMultipart();
    });
});

test('converts pdf to html using native parser when doc-engine is unreachable', function () {
    config()->set('services.doc_engine.url', 'http://doc-engine:8000');

    Http::fake([
        'http://doc-engine:8000/analyze' => Http::response(null, 500),
    ]);

    $action = app(ConvertFileToHtmlAction::class);
    // Real minimal valid PDF with "Hello World"
    $minimalPdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF";

    $file = UploadedFile::fake()->createWithContent('document.pdf', $minimalPdf);

    $html = $action->handle($file);

    expect($html)->toBeString();
    expect($html)->toContain('pdf-page');
    expect($html)->toContain('pdf-body');
});

test('convert html to pdf', function () {
    $action = app(ConvertHtmlToPdfAction::class);

    $html = '<div class="test"><p>Test content</p></div>';

    $pdf = $action->handle($html);

    expect($pdf)->toBeString();
    expect($pdf)->not->toBeEmpty();
    expect(mb_strlen($pdf))->toBeGreaterThan(100);
});
