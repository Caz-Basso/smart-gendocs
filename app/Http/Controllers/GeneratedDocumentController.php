<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\UpdateGeneratedDocumentAction;
use App\Models\GeneratedDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class GeneratedDocumentController
{
    public function index(): Response
    {
        $documents = GeneratedDocument::query()
            ->where('user_id', Auth::id())
            ->latest()
            ->get(['id', 'name', 'model_key', 'created_at']);

        return Inertia::render('documents/index', ['documents' => $documents]);
    }

    public function edit(string $document): Response
    {
        $savedDocument = $this->findOwnedDocument($document);

        return Inertia::render('documents/edit', [
            'document' => [
                'id' => $savedDocument->id,
                'name' => $savedDocument->name,
                'data' => $savedDocument->data,
                'fields' => $savedDocument->fields,
                'created_at' => $savedDocument->created_at,
            ],
        ]);
    }

    public function update(Request $request, string $document, UpdateGeneratedDocumentAction $updateGeneratedDocument): RedirectResponse
    {
        $savedDocument = $this->findOwnedDocument($document);
        $validated = $request->validate([
            'data' => ['required', 'array'],
            'data.*' => ['nullable', 'string', 'max:10000'],
        ]);

        try {
            $updateGeneratedDocument->handle($savedDocument, $validated['data']);
        } catch (RuntimeException $exception) {
            return back()->withErrors(['document' => $exception->getMessage()]);
        }

        return redirect()->route('documents.edit', $savedDocument->id)
            ->with('success', 'Documento atualizado com sucesso!');
    }

    public function download(string $document): StreamedResponse
    {
        $savedDocument = $this->findOwnedDocument($document);

        abort_unless(Storage::disk('local')->exists($savedDocument->file_path), 404);

        return Storage::disk('local')->download(
            $savedDocument->file_path,
            str($savedDocument->name)->slug()->append('.pdf')->toString(),
            ['Content-Type' => 'application/pdf'],
        );
    }

    public function destroy(string $document): RedirectResponse
    {
        $savedDocument = $this->findOwnedDocument($document);
        Storage::disk('local')->delete($savedDocument->file_path);
        $savedDocument->delete();

        return redirect()->route('documents.index')->with('success', 'Documento excluído.');
    }

    private function findOwnedDocument(string $id): GeneratedDocument
    {
        return GeneratedDocument::query()
            ->where('user_id', Auth::id())
            ->findOrFail($id);
    }
}
