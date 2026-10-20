<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Attributes\WithoutIncrementing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'id',
    'name',
    'template_path',
    'extracted_text',
    'html_content',
    'document_structure',
    'fields',
    'user_id',
])]
#[Table(name: 'document_models', keyType: 'uuid')]
#[WithoutIncrementing]
final class DocumentModel extends Model
{
    use HasFactory;
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function modelElements(): HasMany
    {
        return $this->hasMany(DocumentModelElement::class, 'document_model_id')->orderBy('z_index');
    }

    public function documentElements(): BelongsToMany
    {
        return $this->belongsToMany(
            DocumentElement::class,
            'document_model_elements',
            'document_model_id',
            'document_element_id'
        )->withPivot([
            'position_x',
            'position_y',
            'width',
            'height',
            'repeat_all_pages',
            'pages',
            'z_index',
        ])->withTimestamps()->orderByPivot('z_index');
    }

    protected function casts(): array
    {
        return [
            'fields' => 'array',
            'document_structure' => 'array',
        ];
    }
}
