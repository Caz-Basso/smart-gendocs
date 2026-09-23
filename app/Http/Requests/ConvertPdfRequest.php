<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

final class ConvertPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf', 'max:25600'],
        ];
    }

    /**
     * Arquivo enviado, já validado como PDF.
     */
    public function pdf(): UploadedFile
    {
        $file = $this->file('file');

        assert($file instanceof UploadedFile);

        return $file;
    }

    protected function passedValidation(): void
    {
        // Garante que o disco 'public' existe antes de salvar o DOCX.
        if (! Storage::disk('public')->exists('word')) {
            Storage::disk('public')->makeDirectory('word');
        }
    }
}
