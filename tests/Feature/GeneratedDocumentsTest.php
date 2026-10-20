<?php

declare(strict_types=1);

use App\Enums\RoleName;
use App\Models\DocumentModel;
use App\Models\GeneratedDocument;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mpdf\Mpdf;
use Spatie\Permission\Models\Role;

function createDocumentUser(): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::findOrCreate(RoleName::User->value, 'web'));

    return $user;
}

function createDocumentTemplate(User $user): DocumentModel
{
    return DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Declaração',
        'extracted_text' => 'Declaro que {{nome}} recebeu este documento.',
        'fields' => [['id' => 'nome', 'name' => 'Nome', 'slug' => 'nome', 'type' => 'text']],
        'user_id' => $user->id,
    ]);
}

it('saves generated pdfs and lets their owner download edit and delete them', function (): void {
    Storage::fake('local');

    $user = createDocumentUser();
    $model = createDocumentTemplate($user);

    $this->actingAs($user)
        ->post(route('documents.generate'), [
            'model_id' => $model->id,
            'document_name' => $model->name,
            'data' => ['nome' => 'Ana'],
        ])
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $savedDocument = GeneratedDocument::query()->sole();
    expect($savedDocument->user_id)->toBe($user->id)
        ->and(Storage::disk('local')->get($savedDocument->file_path))->toStartWith('%PDF-');

    $this->actingAs($user)
        ->get(route('documents.edit', $savedDocument))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/edit')
            ->where('document.data.nome', 'Ana')
            ->where('document.extracted_html', $model->extracted_text)
            ->has('document.fields', 1)
        );

    $this->actingAs($user)
        ->get(route('documents.download', $savedDocument))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf');

    $this->put(route('documents.update', $savedDocument), [
        'data' => ['nome' => 'Beatriz'],
    ])->assertRedirect(route('documents.edit', $savedDocument));

    expect($savedDocument->refresh()->data['nome'])->toBe('Beatriz');

    $this->delete(route('documents.destroy', $savedDocument))
        ->assertRedirect(route('documents.index'));

    expect(GeneratedDocument::query()->count())->toBe(0)
        ->and(Storage::disk('local')->exists($savedDocument->file_path))->toBeFalse();
});

it('does not allow one user to access another users saved documents', function (): void {
    Storage::fake('local');

    $owner = createDocumentUser();
    $otherUser = createDocumentUser();
    $model = createDocumentTemplate($owner);
    $this->actingAs($owner)->post(route('documents.generate'), [
        'model_id' => $model->id,
        'document_name' => $model->name,
        'data' => ['nome' => 'Ana'],
    ])->assertOk();

    $savedDocument = GeneratedDocument::query()->sole();

    $this->actingAs($otherUser)
        ->get(route('documents.download', $savedDocument))
        ->assertNotFound();

    $this->delete(route('documents.destroy', $savedDocument))
        ->assertNotFound();
});

it('generates one pdf page for each saved page break', function (): void {
    $user = createDocumentUser();
    $pageContent = array_fill(0, 10, '<p>Conteúdo da página.</p>');
    $pageBreak = '<div class="page-break" style="page-break-after: always;"></div>';
    $model = createDocumentTemplate($user);
    $model->update([
        'extracted_text' => implode($pageBreak, $pageContent),
    ]);

    $pdf = app(App\Actions\GenerateDocumentAction::class)->handle($model->id, []);
    $pdfPath = tempnam(sys_get_temp_dir(), 'generated_pages_');
    file_put_contents($pdfPath, $pdf);

    try {
        $reader = new Mpdf(['mode' => 'utf-8']);

        expect($reader->SetSourceFile($pdfPath))->toBe(10);
    } finally {
        unlink($pdfPath);
    }
});
