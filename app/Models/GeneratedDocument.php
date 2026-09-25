<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class GeneratedDocument extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'user_id', 'document_model_id', 'name', 'file_path'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documentModel(): BelongsTo
    {
        return $this->belongsTo(DocumentModel::class);
    }
}
