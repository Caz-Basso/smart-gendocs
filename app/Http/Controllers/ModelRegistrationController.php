<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateModelAction;
use App\Actions\GenerateDocumentAction;
use App\Enums\FieldType;
use App\Http\Requests\GenerateDocumentRequest;
use App\Http\Requests\StoreModelRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

final class ModelRegistrationController
{
    public function dashboard(): Response
    {
        // Se for admin, mostra todos os modelos. Se for user, mostra apenas os próprios
        if (Auth::user()->hasRole('admin') || Auth::user()->hasRole('super-admin')) {
            $documentModels = \App\Models\DocumentModel::latest()->get();
        } else {
            $documentModels = \App\Models\DocumentModel::where('user_id', Auth::id())
                ->latest()
                ->get();
        }

        $documentModels = $documentModels->map(function ($model) {
            $fields = collect($model->fields ?? [])->map(function ($field) {
                return [
                    'id' => $field['id'] ?? $field['slug'],
                    'name' => $field['name'],
                    'slug' => $field['slug'],
                    'type' => $field['type'],
                    'required' => false,
                    'placeholder' => '',
                    'section' => 'Dados do Documento',
                ];
            })->toArray();

            if ($model->document_structure !== null) {
                $preview = collect($model->document_structure['pages'] ?? [])
                    ->flatMap(fn (array $page) => collect($page['elements'] ?? [])->pluck('text'))
                    ->values()
                    ->all();
            } elseif ($model->extracted_text !== null) {
                $preview = collect(explode('</p>', $model->extracted_text))
                    ->map(fn ($p) => strip_tags($p))
                    ->filter(fn ($p) => ! empty(mb_trim($p)))
                    ->toArray();
            } else {
                $preview = [];
            }

            return [
                'id' => $model->id,
                'name' => $model->name,
                'fields' => $fields,
                'preview' => $preview,
            ];
        });

        return Inertia::render('dashboard', [
            'customModels' => $documentModels,
            'showMockModels' => $documentModels->isEmpty(),
            'isAdmin' => Auth::user()->hasRole('admin') || Auth::user()->hasRole('super-admin'),
        ]);
    }

    public function index(): Response
    {
        $models = \App\Models\DocumentModel::where('user_id', Auth::id())
            ->latest()
            ->get();
        $query = \App\Models\DocumentModel::with('user')->latest();

        if (! Auth::user()->hasRole('admin') && ! Auth::user()->hasRole('super-admin')) {
            $query->where('user_id', Auth::id());
        }

        $models = $query->get();

        return Inertia::render('models/index', [
            'models' => $models,
        ]);
    }

    public function create(): Response
    {
        $fieldTypeOptions = array_map(fn ($type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], FieldType::cases());

        return Inertia::render('model-registration', [
            'fieldTypeOptions' => $fieldTypeOptions,
        ]);
    }

    public function store(StoreModelRequest $request, CreateModelAction $createModel): RedirectResponse
    {
        $model = $createModel->handle($request->validated(), (string) Auth::id());

        return redirect()->route('models.index')
            ->with('success', 'Modelo criado com sucesso!');
    }

    public function edit(string $id): Response
    {
        $model = \App\Models\DocumentModel::findOrFail($id);

        $fieldTypeOptions = array_map(fn ($type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], FieldType::cases());

        return Inertia::render('model-edit', [
            'model' => $model,
            'templateUrl' => $model->template_path !== null
                ? Storage::disk('public')->url($model->template_path)
                : null,
            'templateIsPdf' => $model->template_path !== null
                && str_ends_with(mb_strtolower($model->template_path), '.pdf'),
            'fieldTypeOptions' => $fieldTypeOptions,
        ]);
    }

    public function update(StoreModelRequest $request, string $id): RedirectResponse
    {
        $model = \App\Models\DocumentModel::findOrFail($id);

        // Handle update logic here if needed, for now just update basic fields
        $data = $request->validated();
        $templatePath = $model->template_path;

        if (isset($data['template']) && $data['template'] instanceof \Illuminate\Http\UploadedFile) {
            $templatePath = $data['template']->store('templates', 'public');
        }

        $model->update([
            'name' => $data['name'],
            'template_path' => $templatePath,
            'extracted_text' => $data['extracted_text'] ?? $model->extracted_text,
            'document_structure' => array_key_exists('document_structure', $data)
                ? $data['document_structure']
                : $model->document_structure,
            'fields' => $data['fields'],
        ]);

        return redirect()->route('models.index')
            ->with('success', 'Modelo atualizado com sucesso!');
    }

    public function generate(GenerateDocumentRequest $request, GenerateDocumentAction $generateDocument): HttpResponse
    {
        $model = \App\Models\DocumentModel::findOrFail($request->input('model_id'));
        $pdfContent = $generateDocument->handle(
            $request->input('model_id'),
            $request->input('data')
        );

        $fileName = mb_strtolower($model->name).'.pdf';
        $fileName = preg_replace('/[^a-z0-9]+/', '_', $fileName);

        return new HttpResponse($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'Cache-Control' => 'private, max-age=0, must-revalidate',
            'Pragma' => 'public',
        ]);
    }
}
