<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'id',
    'user_id',
    'document_model_id',
    'model_key',
    'name',
    'data',
    'preview',
    'fields',
    'file_path',
    'html_content',
])]
final class GeneratedDocument extends Model
{
    use HasFactory;
    use HasFactory;
    use HasUuids;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documentModel(): BelongsTo
    {
        return $this->belongsTo(DocumentModel::class);
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'preview' => 'array',
            'fields' => 'array',
        ];
    }
}
