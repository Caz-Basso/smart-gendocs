<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\DocumentElementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreDocumentElementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && ($this->user()->hasRole('admin') || $this->user()->hasRole('super-admin'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::enum(DocumentElementType::class)],
            'image' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'], // Max 5MB
            'width' => ['required', 'numeric', 'min:5', 'max:210'], // Largura em mm (máx A4 = 210mm)
            'height' => ['required', 'numeric', 'min:5', 'max:297'], // Altura em mm (máx A4 = 297mm)
            'position_x' => ['required', 'numeric', 'min:0', 'max:210'], // Posição X em mm
            'position_y' => ['required', 'numeric', 'min:0', 'max:297'], // Posição Y em mm
            'page_target' => ['nullable', 'string', 'in:all,first,except_first,custom'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'O nome do elemento é obrigatório.',
            'type.required' => 'O tipo do elemento (cabeçalho ou rodapé) é obrigatório.',
            'image.required' => 'A imagem do cabeçalho ou rodapé é obrigatória.',
            'image.image' => 'O arquivo enviado deve ser uma imagem válida.',
            'image.mimes' => 'A imagem deve estar no formato PNG, JPG, JPEG ou WebP.',
            'image.max' => 'A imagem não pode ultrapassar 5 MB.',
            'width.required' => 'A largura em milímetros é obrigatória.',
            'width.max' => 'A largura não pode exceder o limite da folha A4 (210 mm).',
            'height.required' => 'A altura em milímetros é obrigatória.',
            'height.max' => 'A altura não pode exceder o limite da folha A4 (297 mm).',
            'position_x.required' => 'A posição horizontal (X) é obrigatória.',
            'position_y.required' => 'A posição vertical (Y) é obrigatória.',
        ];
    }
}

