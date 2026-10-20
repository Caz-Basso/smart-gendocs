<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DocumentElementType;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Appends([
    'image_url',
])]
#[Fillable([
    'id',
    'name',
    'type',
    'image_path',
    'width',
    'height',
    'position_x',
    'position_y',
    'page_target',
    'is_active',
    'user_id',
])]
#[Table(name: 'document_elements')]
final class DocumentElement extends Model
{
    use HasFactory;
    use HasFactory;
    use HasUuids;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function modelElements(): HasMany
    {
        return $this->hasMany(DocumentModelElement::class, 'document_element_id');
    }

    public function models(): BelongsToMany
    {
        return $this->belongsToMany(
            DocumentModel::class,
            'document_model_elements',
            'document_element_id',
            'document_model_id'
        )->withPivot([
            'position_x',
            'position_y',
            'width',
            'height',
            'repeat_all_pages',
            'pages',
            'z_index',
        ])->withTimestamps();
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::make(get: fn () => $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null);
    }

    protected function casts(): array
    {
        return [
            'type' => DocumentElementType::class,
            'width' => 'float',
            'height' => 'float',
            'position_x' => 'float',
            'position_y' => 'float',
            'is_active' => 'boolean',
        ];
    }
}
