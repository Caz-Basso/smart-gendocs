<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DocumentModelElement extends Model
{
    use HasUuids;

    protected $table = 'document_model_elements';

    protected $fillable = [
        'id',
        'document_model_id',
        'document_element_id',
        'position_x',
        'position_y',
        'width',
        'height',
        'repeat_all_pages',
        'pages',
        'z_index',
    ];

    protected $casts = [
        'position_x' => 'float',
        'position_y' => 'float',
        'width' => 'float',
        'height' => 'float',
        'repeat_all_pages' => 'boolean',
        'pages' => 'array',
        'z_index' => 'integer',
    ];

    public function documentModel(): BelongsTo
    {
        return $this->belongsTo(DocumentModel::class, 'document_model_id');
    }

    public function documentElement(): BelongsTo
    {
        return $this->belongsTo(DocumentElement::class, 'document_element_id');
    }

    /**
     * Retorna a posição X resolvida (override do modelo ou default do elemento).
     */
    public function getEffectivePositionX(): float
    {
        return $this->position_x ?? $this->documentElement->position_x;
    }

    /**
     * Retorna a posição Y resolvida (override do modelo ou default do elemento).
     */
    public function getEffectivePositionY(): float
    {
        return $this->position_y ?? $this->documentElement->position_y;
    }

    /**
     * Retorna a largura resolvida (override do modelo ou default do elemento).
     */
    public function getEffectiveWidth(): float
    {
        return $this->width ?? $this->documentElement->width;
    }

    /**
     * Retorna a altura resolvida (override do modelo ou default do elemento).
     */
    public function getEffectiveHeight(): float
    {
        return $this->height ?? $this->documentElement->height;
    }

    /**
     * Verifica se o elemento deve ser aplicado em uma determinada página (1-indexed).
     */
    public function appliesToPage(int $pageNumber): bool
    {
        if ($this->repeat_all_pages) {
            return true;
        }

        if (empty($this->pages)) {
            return $pageNumber === 1;
        }

        return in_array($pageNumber, $this->pages, true);
    }
}

