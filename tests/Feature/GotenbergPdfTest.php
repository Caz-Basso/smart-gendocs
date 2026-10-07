<?php

declare(strict_types=1);

use App\Actions\ConvertHtmlToPdfAction;
use App\Services\GotenbergClient;

test('gotenberg client checks availability', function () {
    $client = new GotenbergClient();

    $isAvailable = $client->isAvailable();

    expect($isAvailable)->toBeBool();
});

test('convert html to pdf action generates valid pdf', function () {
    $action = new ConvertHtmlToPdfAction();

    $html = <<<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Test Document</h1>
    <p>This is a test paragraph for PDF generation.</p>
</body>
</html>
HTML;

    try {
        $pdf = $action->handle($html);

        expect($pdf)->toBeString();
        expect(mb_strlen($pdf))->toBeGreaterThan(100);
        expect(mb_strpos($pdf, '%PDF'))->toBe(0);
    } catch (RuntimeException $e) {
        $this->markTestSkipped('Gotenberg service not available: '.$e->getMessage());
    }
});

test('convert html to pdf with header and footer', function () {
    $action = new ConvertHtmlToPdfAction();

    $html = '<h1>Main Content</h1><p>Document body content.</p>';
    $headerHtml = '<div style="text-align: center; font-size: 10px;">UNESC - Universidade do Extremo Sul Catarinense</div>';
    $footerHtml = '<div style="text-align: center; font-size: 9px;">Page <span class="pageNumber"></span></div>';

    try {
        $pdf = $action->handle($html, $headerHtml, $footerHtml);

        expect($pdf)->toBeString();
        expect(mb_strpos($pdf, '%PDF'))->toBe(0);
    } catch (RuntimeException $e) {
        $this->markTestSkipped('Gotenberg service not available: '.$e->getMessage());
    }
});
