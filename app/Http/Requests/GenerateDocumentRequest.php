<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\DocumentModel;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

final class GenerateDocumentRequest extends FormRequest
{
    private const SAMPLE_MODEL_IDS = [
        'proposta-comercial',
        'contrato-estagio',
        'declaracao-matricula',
        'contrato-servicos',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'model_id' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (Str::isUuid($value)) {
                        if (! DocumentModel::whereKey($value)->exists()) {
                            $fail('O modelo selecionado não foi encontrado.');
                        }

                        return;
                    }

                    if (! in_array($value, self::SAMPLE_MODEL_IDS, true)) {
                        $fail('O identificador do modelo é inválido.');
                    }
                },
            ],
            'data' => 'required|array',
            'data.*' => 'nullable|string|max:10000',
            'preview' => 'required_if:model_id,proposta-comercial,contrato-estagio,declaracao-matricula,contrato-servicos|array|min:1|max:100',
            'preview.*' => 'nullable|string|max:10000',
        ];
    }

    public function messages(): array
    {
        return [
            'model_id.required' => 'Selecione um modelo para gerar o documento.',
            'model_id.string' => 'O identificador do modelo é inválido.',
            'data.required' => 'Os dados do documento são obrigatórios.',
            'data.array' => 'Os dados do documento estão em formato inválido.',
            'data.*.string' => 'Os valores dos campos devem ser texto.',
            'data.*.max' => 'Um dos campos excede o limite de 10.000 caracteres.',
            'preview.required_if' => 'O conteúdo do modelo de demonstração não foi enviado.',
            'preview.array' => 'O conteúdo do modelo está em formato inválido.',
            'preview.*.string' => 'Um trecho do modelo deve ser texto.',
            'preview.*.max' => 'Um trecho do modelo excede o limite de 10.000 caracteres.',
        ];
    }
}
