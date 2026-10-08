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

    public function modelElements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DocumentModelElement::class, 'document_model_id')->orderBy('z_index');
    }

    public function documentElements(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
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
}
