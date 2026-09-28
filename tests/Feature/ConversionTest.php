<?php

declare(strict_types=1);

use App\Actions\ConvertFileToHtmlAction;
use App\Actions\ConvertHtmlToPdfAction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('convert docx to html', function () {
    Storage::fake('public');

    $action = app(ConvertFileToHtmlAction::class);

    $file = UploadedFile::fake()->create('document.docx', 1000);

    $html = $action->handle($file);

    expect($html)->toBeString();
    expect($html)->not->toBeEmpty();
});

test('convert html to pdf', function () {
    $action = app(ConvertHtmlToPdfAction::class);

    $html = '<div class="test"><p>Test content</p></div>';

    $pdf = $action->handle($html);

    expect($pdf)->toBeString();
    expect($pdf)->not->toBeEmpty();
    expect(mb_strlen($pdf))->toBeGreaterThan(100);
});
