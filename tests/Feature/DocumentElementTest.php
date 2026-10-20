<?php

declare(strict_types=1);

use App\Actions\GenerateDocumentAction;
use App\Enums\DocumentElementType;
use App\Enums\RoleName;
use App\Models\DocumentElement;
use App\Models\DocumentModel;
use App\Models\DocumentModelElement;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

function createAdminUser(): User
{
    $admin = User::factory()->create(['is_active' => true]);
    $admin->assignRole(Role::findOrCreate(RoleName::Admin->value, 'web'));

    return $admin;
}

function createRegularUser(): User
{
    $user = User::factory()->create(['is_active' => true]);
    $user->assignRole(Role::findOrCreate(RoleName::User->value, 'web'));

    return $user;
}

it('forbids regular users from accessing document elements', function (): void {
    $user = createRegularUser();

    $this->actingAs($user)
        ->get(route('document-elements.index'))
        ->assertForbidden();
});

it('allows admin to list document elements', function (): void {
    $admin = createAdminUser();

    DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Cabeçalho Teste',
        'type' => DocumentElementType::Header,
        'image_path' => 'document-elements/test.png',
        'width' => 210,
        'height' => 35,
        'position_x' => 0,
        'position_y' => 0,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get(route('document-elements.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('document-elements/index')
            ->has('elements', 1)
        );
});

it('allows admin to create a new document element with valid image', function (): void {
    Storage::fake('public');
    $admin = createAdminUser();

    $file = UploadedFile::fake()->image('cabecalho.png', 800, 200);

    $response = $this->actingAs($admin)
        ->post(route('document-elements.store'), [
            'name' => 'Cabeçalho Oficial',
            'type' => 'header',
            'image' => $file,
            'position_x' => 0,
            'position_y' => 0,
            'width' => 210,
            'height' => 35,
            'is_active' => true,
        ]);

    $response->assertRedirect(route('document-elements.index'));

    $element = DocumentElement::query()->first();
    expect($element)->not->toBeNull()
        ->and($element->name)->toBe('Cabeçalho Oficial')
        ->and($element->type)->toBe(DocumentElementType::Header)
        ->and($element->width)->toEqual(210)
        ->and($element->height)->toEqual(35)
        ->and(Storage::disk('public')->exists($element->image_path))->toBeTrue();
});

it('validates image file requirements', function (): void {
    $admin = createAdminUser();

    $invalidFile = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $this->actingAs($admin)
        ->post(route('document-elements.store'), [
            'name' => 'Cabeçalho Inválido',
            'type' => 'header',
            'image' => $invalidFile,
            'position_x' => 0,
            'position_y' => 0,
            'width' => 210,
            'height' => 35,
        ])
        ->assertSessionHasErrors(['image']);
});

it('allows admin to update a document element', function (): void {
    Storage::fake('public');
    $admin = createAdminUser();

    $element = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Cabeçalho Antigo',
        'type' => DocumentElementType::Header,
        'image_path' => 'document-elements/old.png',
        'width' => 210,
        'height' => 35,
        'position_x' => 0,
        'position_y' => 0,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->put(route('document-elements.update', $element), [
            'name' => 'Cabeçalho Atualizado',
            'type' => 'header',
            'position_x' => 10,
            'position_y' => 5,
            'width' => 190,
            'height' => 30,
            'is_active' => false,
        ])
        ->assertRedirect(route('document-elements.index'));

    $element->refresh();
    expect($element->name)->toBe('Cabeçalho Atualizado')
        ->and($element->position_x)->toEqual(10)
        ->and($element->position_y)->toEqual(5)
        ->and($element->width)->toEqual(190)
        ->and($element->height)->toEqual(30)
        ->and($element->is_active)->toBeFalse();
});

it('toggles active state of a document element', function (): void {
    $admin = createAdminUser();

    $element = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Rodapé Padrão',
        'type' => DocumentElementType::Footer,
        'image_path' => 'document-elements/footer.png',
        'width' => 210,
        'height' => 30,
        'position_x' => 0,
        'position_y' => 267,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->patch(route('document-elements.toggle-active', $element))
        ->assertRedirect();

    expect($element->refresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->patch(route('document-elements.toggle-active', $element))
        ->assertRedirect();

    expect($element->refresh()->is_active)->toBeTrue();
});

it('blocks deletion of document element when attached to a model', function (): void {
    $admin = createAdminUser();

    $element = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Cabeçalho em Uso',
        'type' => DocumentElementType::Header,
        'image_path' => 'document-elements/header.png',
        'width' => 210,
        'height' => 35,
        'position_x' => 0,
        'position_y' => 0,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $model = DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Modelo Vinculado',
        'extracted_text' => '<p>Documento de teste</p>',
        'fields' => [],
        'user_id' => $admin->id,
    ]);

    DocumentModelElement::create([
        'id' => (string) Str::uuid(),
        'document_model_id' => $model->id,
        'document_element_id' => $element->id,
        'repeat_all_pages' => true,
        'z_index' => 10,
    ]);

    $this->actingAs($admin)
        ->delete(route('document-elements.destroy', $element))
        ->assertRedirect(route('document-elements.index'))
        ->assertSessionHas('error');

    expect(DocumentElement::find($element->id))->not->toBeNull();
});

it('allows deletion of an unused document element', function (): void {
    Storage::fake('public');
    $admin = createAdminUser();

    $imagePath = 'document-elements/unused.png';
    Storage::disk('public')->put($imagePath, 'fake-image-content');

    $element = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Elemento Não Usado',
        'type' => DocumentElementType::Footer,
        'image_path' => $imagePath,
        'width' => 210,
        'height' => 35,
        'position_x' => 0,
        'position_y' => 262,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->delete(route('document-elements.destroy', $element))
        ->assertRedirect(route('document-elements.index'))
        ->assertSessionHas('success');

    expect(DocumentElement::find($element->id))->toBeNull()
        ->and(Storage::disk('public')->exists($imagePath))->toBeFalse();
});

it('renders headers and footers in generated PDF', function (): void {
    Storage::fake('public');
    $admin = createAdminUser();

    $headerImgPath = 'document-elements/official-header.png';
    Storage::disk('public')->put($headerImgPath, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));

    $header = DocumentElement::create([
        'id' => (string) Str::uuid(),
        'name' => 'Cabeçalho UNESC',
        'type' => DocumentElementType::Header,
        'image_path' => $headerImgPath,
        'width' => 210,
        'height' => 35,
        'position_x' => 0,
        'position_y' => 0,
        'is_active' => true,
        'user_id' => $admin->id,
    ]);

    $model = DocumentModel::create([
        'id' => (string) Str::uuid(),
        'name' => 'Edital com Cabeçalho',
        'extracted_text' => '<p>Conteúdo do edital para o candidato {{nome}}.</p>',
        'fields' => [['id' => 'nome', 'name' => 'Nome', 'slug' => 'nome', 'type' => 'text']],
        'user_id' => $admin->id,
    ]);

    DocumentModelElement::create([
        'id' => (string) Str::uuid(),
        'document_model_id' => $model->id,
        'document_element_id' => $header->id,
        'repeat_all_pages' => true,
        'z_index' => 10,
    ]);

    $generateAction = app(GenerateDocumentAction::class);
    $pdf = $generateAction->handle($model->id, ['nome' => 'Carlos']);

    expect($pdf)->toStartWith('%PDF-');
});

