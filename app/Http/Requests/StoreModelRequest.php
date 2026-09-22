<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

final class StoreModelRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
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
            'fields.*.type' => 'required|string|in:text,date,number,email',
            'extracted_text' => 'nullable|string',
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
            'fields.*.type.in' => 'O tipo do campo deve ser texto, data, número ou email.',
        ];
    }
}
