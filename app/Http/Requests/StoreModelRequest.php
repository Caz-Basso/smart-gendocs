<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\FieldType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreModelRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $structure = $this->input('document_structure');

        if (! is_array($structure) || ! is_array($structure['pages'] ?? null)) {
            return;
        }

        $structure['pages'] = array_map(function (mixed $page): mixed {
            if (! is_array($page) || ! is_array($page['elements'] ?? null)) {
                return $page;
            }

            $page['elements'] = array_values(array_filter(
                $page['elements'],
                static function (mixed $element): bool {
                    if (! is_array($element)) {
                        return false;
                    }

                    foreach (['x', 'y', 'width', 'height', 'fontSize'] as $coordinate) {
                        if (! array_key_exists($coordinate, $element)
                            || ! is_numeric($element[$coordinate])
                            || ! is_finite((float) $element[$coordinate])) {
                            return false;
                        }
                    }

                    return true;
                },
            ));

            return $page;
        }, $structure['pages']);

        $this->merge(['document_structure' => $structure]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'template' => 'nullable|file|mimes:pdf,docx|max:10240',
            'fields' => 'required|array|min:1',
            'fields.*.id' => 'required|string',
            'fields.*.name' => 'required|string|max:255',
            'fields.*.slug' => 'required|string|max:255',
            'fields.*.type' => ['required', 'string', Rule::enum(FieldType::class)],
            'extracted_text' => 'nullable|string',
            'document_structure' => 'nullable|array',
            'document_structure.version' => 'required_with:document_structure|integer|in:1',
            'document_structure.pages' => 'required_with:document_structure|array|min:1|max:100',
            'document_structure.pages.*.width' => 'required|numeric|min:1|max:10000',
            'document_structure.pages.*.height' => 'required|numeric|min:1|max:10000',
            'document_structure.pages.*.elements' => 'required|array|max:2000',
            'document_structure.pages.*.elements.*.x' => 'required|numeric|min:0|max:1',
            'document_structure.pages.*.elements.*.y' => 'required|numeric|min:0|max:1',
            'document_structure.pages.*.elements.*.width' => 'required|numeric|min:0|max:1',
            'document_structure.pages.*.elements.*.height' => 'required|numeric|min:0|max:1',
            'document_structure.pages.*.elements.*.fontSize' => 'required|numeric|min:1|max:200',
            'document_structure.pages.*.elements.*.text' => 'nullable|string|max:10000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome do modelo é obrigatório.',
            'template.mimes' => 'O arquivo deve ser do tipo PDF ou DOCX.',
            'template.max' => 'O arquivo não pode ter mais de 10MB.',
            'fields.required' => 'É necessário pelo menos um campo.',
            'fields.*.name.required' => 'O nome do campo é obrigatório.',
            'fields.*.type.enum' => 'O tipo do campo selecionado não é válido.',
        ];
    }
}
