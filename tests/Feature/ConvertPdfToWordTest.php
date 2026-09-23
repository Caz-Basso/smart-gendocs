<?php

declare(strict_types=1);

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

use function Pest\Laravel\actingAs;

it('returns the structured docx produced by the converter service', function (): void {
    Http::fake([
        'pdf-converter:8000/convert' => Http::response(
            file_get_contents(__DIR__.'/Fixtures/fake.docx'),
            200,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        ),
    ]);

    actingAs(superAdmin())
        ->post(route('models.convert'), [
            'file' => UploadedFile::fake()->createWithContent(
                'contrato.pdf',
                file_get_contents(__DIR__.'/Fixtures/fake.pdf'),
            ),
        ])
        ->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        ->assertSee('fake-docx-content', false);
});

it('rejects non pdf uploads', function (): void {
    Http::fake();

    actingAs(superAdmin())
        ->withHeaders(['Accept' => 'application/json'])
        ->post(route('models.convert'), [
            'file' => UploadedFile::fake()->create('documento.txt', 100),
        ])
        ->assertJsonValidationErrors('file');

    Http::assertNothingSent();
});

it('returns a json error when the converter service fails', function (): void {
    Http::fake([
        'pdf-converter:8000/convert' => Http::response(['detail' => 'Falha ao converter o PDF: corrompido.'], 422),
    ]);

    actingAs(superAdmin())
        ->post(route('models.convert'), [
            'file' => UploadedFile::fake()->createWithContent('ruim.pdf', "%PDF-1.4\nquebrado"),
        ])
        ->assertStatus(502)
        ->assertJson(['error' => 'Falha ao converter o PDF: corrompido.']);
});

it('does not leak the docx when the converter service is down', function (): void {
    Http::fake(fn () => throw new ConnectionException('timeout'));

    actingAs(superAdmin())
        ->post(route('models.convert'), [
            'file' => UploadedFile::fake()->createWithContent('doc.pdf', '%PDF-1.4'),
        ])
        ->assertStatus(502)
        ->assertJson(['error' => 'Serviço de conversão indisponível.']);
});
