<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DocumentModel extends Model
{
    public $incrementing = false;

    protected $table = 'document_models';

    protected $fillable = [
        'id',
        'name',
        'template_path',
        'extracted_text',
        'document_structure',
        'fields',
        'user_id',
    ];

    protected $casts = [
        'fields' => 'array',
        'document_structure' => 'array',
    ];

    protected $keyType = 'uuid';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
