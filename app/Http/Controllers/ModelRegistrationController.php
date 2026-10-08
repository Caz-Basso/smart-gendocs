<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\CreateModelAction;
use App\Actions\GenerateDocumentAction;
use App\Actions\GenerateSampleDocumentAction;
use App\Actions\StoreGeneratedDocumentAction;
use App\Enums\FieldType;
use App\Http\Requests\GenerateDocumentRequest;
use App\Http\Requests\StoreModelRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

            $preview = $model->document_structure !== null
                ? collect($model->document_structure['pages'] ?? [])
                    ->flatMap(fn (array $page) => collect($page['elements'] ?? [])->pluck('text'))
                    ->filter(fn ($text) => is_string($text) && ! empty(mb_trim($text)))
                    ->values()
                    ->all()
                : [];

            if ($preview === [] && $model->extracted_text !== null) {
                $preview = collect(explode('</p>', $model->extracted_text))
                    ->map(fn ($paragraph) => strip_tags($paragraph))
                    ->filter(fn ($paragraph) => ! empty(mb_trim($paragraph)))
                    ->values()
                    ->all();
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

    public function analyze(
        \Illuminate\Http\Request $request,
        \App\Actions\ProcessDocumentTemplate $processDocument,
    ): \Illuminate\Http\JsonResponse {
        $validated = $request->validate([
            'template' => 'required|file|mimes:pdf,docx|max:10240',
        ]);

        $result = $processDocument->handle($validated['template']);

        return response()->json([
            'kind' => 'rich_document',
            'html' => $result['html'],
            'fieldsDetected' => $result['fieldsDetected'] ?? [],
            'documentType' => $result['documentType'] ?? 'document',
            'isScanned' => $result['isScanned'] ?? false,
            'isDocx' => $result['isDocx'] ?? false,
        ]);
    }

    public function edit(string $id): Response
    {
        $model = \App\Models\DocumentModel::findOrFail($id);

        $fieldTypeOptions = array_map(fn ($type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], FieldType::cases());

        $hasConvertedPdf = $model->template_path !== null
            && str_ends_with(mb_strtolower($model->template_path), '.docx')
            && Storage::disk('public')->exists($model->template_path.'.converted.pdf');

        $templateUrl = null;
        if ($model->template_path !== null) {
            $templateUrl = $hasConvertedPdf
                ? Storage::disk('public')->url($model->template_path.'.converted.pdf')
                : Storage::disk('public')->url($model->template_path);
        }

        return Inertia::render('model-edit', [
            'model' => $model,
            'templateUrl' => $templateUrl,
            'templateIsPdf' => $model->template_path !== null
                && (str_ends_with(mb_strtolower($model->template_path), '.pdf') || $hasConvertedPdf),
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

    public function destroy(string $id): RedirectResponse
    {
        $model = \App\Models\DocumentModel::findOrFail($id);
        $templatePath = $model->template_path;

        $model->delete();

        if ($templatePath !== null) {
            Storage::disk('public')->delete($templatePath);
        }

        return redirect()->route('models.index');
    }

    public function generate(
        GenerateDocumentRequest $request,
        GenerateDocumentAction $generateDocument,
        GenerateSampleDocumentAction $generateSampleDocument,
        StoreGeneratedDocumentAction $storeGeneratedDocument,
    ): HttpResponse {
        $data = $request->validated();
        $modelId = $data['model_id'];
        $model = null;

        if (Str::isUuid($modelId)) {
            $model = \App\Models\DocumentModel::findOrFail($modelId);
            $pdfContent = $generateDocument->handle($modelId, $data['data']);
            $fields = $model->fields ?? [];
        } else {
            $pdfContent = $generateSampleDocument->handle($data['preview'], $data['data']);
            $fields = json_decode($data['field_definitions'] ?? '[]', true, flags: JSON_THROW_ON_ERROR);
        }

        $document = $storeGeneratedDocument->handle(
            user: Auth::user(),
            model: $model,
            modelKey: $modelId,
            name: $data['document_name'],
            data: $data['data'],
            preview: $data['preview'] ?? null,
            fields: is_array($fields) ? $fields : [],
            pdfContent: $pdfContent,
        );

        return new HttpResponse($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.Str::slug($document->name).'.pdf"',
            'X-Generated-Document-Id' => $document->id,
            'Cache-Control' => 'private, max-age=0, must-revalidate',
            'Pragma' => 'public',
        ]);
    }
}
