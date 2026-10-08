<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DocumentElementType;
use App\Http\Requests\StoreDocumentElementRequest;
use App\Http\Requests\UpdateDocumentElementRequest;
use App\Models\DocumentElement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

final class DocumentElementController
{
    public function index(Request $request): Response
    {
        $query = DocumentElement::query()
            ->withCount('modelElements')
            ->latest();

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where('name', 'ilike', "%{$search}%");
        }

        if ($request->filled('type') && in_array($request->input('type'), ['header', 'footer'], true)) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $elements = $query->get()->map(fn (DocumentElement $element) => [
            'id' => $element->id,
            'name' => $element->name,
            'type' => $element->type->value,
            'type_label' => $element->type->label(),
            'image_path' => $element->image_path,
            'image_url' => $element->image_url,
            'width' => (float) $element->width,
            'height' => (float) $element->height,
            'position_x' => (float) $element->position_x,
            'position_y' => (float) $element->position_y,
            'page_target' => $element->page_target,
            'is_active' => (bool) $element->is_active,
            'models_count' => $element->model_elements_count,
            'created_at' => $element->created_at?->format('d/m/Y H:i'),
        ]);

        return Inertia::render('document-elements/index', [
            'elements' => $elements,
            'filters' => $request->only(['search', 'type', 'status']),
            'typeOptions' => [
                ['value' => 'all', 'label' => 'Todos os Tipos'],
                ['value' => DocumentElementType::Header->value, 'label' => DocumentElementType::Header->label()],
                ['value' => DocumentElementType::Footer->value, 'label' => DocumentElementType::Footer->label()],
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('document-elements/create', [
            'typeOptions' => [
                ['value' => DocumentElementType::Header->value, 'label' => DocumentElementType::Header->label()],
                ['value' => DocumentElementType::Footer->value, 'label' => DocumentElementType::Footer->label()],
            ],
        ]);
    }

    public function store(StoreDocumentElementRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $imagePath = $request->file('image')->store('document-elements', 'public');

        DocumentElement::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'image_path' => $imagePath,
            'width' => (float) $validated['width'],
            'height' => (float) $validated['height'],
            'position_x' => (float) $validated['position_x'],
            'position_y' => (float) $validated['position_y'],
            'page_target' => $validated['page_target'] ?? 'all',
            'is_active' => $request->boolean('is_active', true),
            'user_id' => Auth::id(),
        ]);

        return redirect()
            ->route('document-elements.index')
            ->with('success', 'Elemento cadastrado com sucesso!');
    }

    public function edit(string $id): Response
    {
        $element = DocumentElement::withCount('modelElements')->findOrFail($id);

        return Inertia::render('document-elements/edit', [
            'element' => [
                'id' => $element->id,
                'name' => $element->name,
                'type' => $element->type->value,
                'type_label' => $element->type->label(),
                'image_path' => $element->image_path,
                'image_url' => $element->image_url,
                'width' => (float) $element->width,
                'height' => (float) $element->height,
                'position_x' => (float) $element->position_x,
                'position_y' => (float) $element->position_y,
                'page_target' => $element->page_target,
                'is_active' => (bool) $element->is_active,
                'models_count' => $element->model_elements_count,
            ],
            'typeOptions' => [
                ['value' => DocumentElementType::Header->value, 'label' => DocumentElementType::Header->label()],
                ['value' => DocumentElementType::Footer->value, 'label' => DocumentElementType::Footer->label()],
            ],
        ]);
    }

    public function update(UpdateDocumentElementRequest $request, string $id): RedirectResponse
    {
        $element = DocumentElement::findOrFail($id);
        $validated = $request->validated();

        $imagePath = $element->image_path;
        if ($request->hasFile('image')) {
            // Remove imagem anterior se existir
            if ($imagePath && Storage::disk('public')->exists($imagePath)) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = $request->file('image')->store('document-elements', 'public');
        }

        $element->update([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'image_path' => $imagePath,
            'width' => (float) $validated['width'],
            'height' => (float) $validated['height'],
            'position_x' => (float) $validated['position_x'],
            'position_y' => (float) $validated['position_y'],
            'page_target' => $validated['page_target'] ?? 'all',
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()
            ->route('document-elements.index')
            ->with('success', 'Elemento atualizado com sucesso!');
    }

    public function destroy(string $id): RedirectResponse
    {
        $element = DocumentElement::withCount('modelElements')->findOrFail($id);

        if ($element->model_elements_count > 0) {
            return redirect()
                ->route('document-elements.index')
                ->with('error', "Não é possível excluir este elemento porque ele está vinculado a {$element->model_elements_count} modelo(s) de documento. Remova o vínculo nos modelos antes de excluir.");
        }

        if ($element->image_path && Storage::disk('public')->exists($element->image_path)) {
            Storage::disk('public')->delete($element->image_path);
        }

        $element->delete();

        return redirect()
            ->route('document-elements.index')
            ->with('success', 'Elemento excluído com sucesso!');
    }

    public function toggleActive(string $id): RedirectResponse
    {
        $element = DocumentElement::findOrFail($id);
        $element->update(['is_active' => ! $element->is_active]);

        $status = $element->is_active ? 'ativado' : 'desativado';

        return redirect()
            ->back()
            ->with('success', "Elemento {$status} com sucesso!");
    }
}

