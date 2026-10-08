<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\DocumentModel;
use App\Models\DocumentModelElement;
use Illuminate\Support\Str;

final readonly class SyncModelElements
{
    /**
     * @param  array<int, array<string, mixed>>  $elementsData
     */
    public function handle(DocumentModel $model, array $elementsData): void
    {
        $model->modelElements()->delete();

        foreach ($elementsData as $index => $item) {
            $elementId = $item['element_id'] ?? $item['document_element_id'] ?? null;
            if (! $elementId) {
                continue;
            }

            DocumentModelElement::create([
                'id' => Str::uuid(),
                'document_model_id' => $model->id,
                'document_element_id' => $elementId,
                'position_x' => isset($item['position_x']) ? (float) $item['position_x'] : null,
                'position_y' => isset($item['position_y']) ? (float) $item['position_y'] : null,
                'width' => isset($item['width']) ? (float) $item['width'] : null,
                'height' => isset($item['height']) ? (float) $item['height'] : null,
                'repeat_all_pages' => filter_var($item['repeat_all_pages'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'pages' => ! empty($item['pages']) && is_array($item['pages']) ? array_values(array_map('intval', $item['pages'])) : null,
                'z_index' => isset($item['z_index']) ? (int) $item['z_index'] : (10 + $index),
            ]);
        }
    }
}

