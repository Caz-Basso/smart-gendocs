<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class GenerateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'model_id' => 'required|uuid|exists:document_models,id',
            'data' => 'required|array',
            'data.*' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'model_id.required' => 'O modelo é obrigatório.',
            'model_id.exists' => 'O modelo selecionado não existe.',
            'data.required' => 'Os dados do documento são obrigatórios.',
        ];
    }
}
