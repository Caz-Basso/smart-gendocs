<?php

namespace App\Http\Controllers;

use App\Enums\FieldType;
use Inertia\Inertia;
use Inertia\Response;

class ModelRegistrationController
{
    public function create(): Response
    {
        $fieldTypeOptions = array_map(fn($type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], FieldType::cases());

        return Inertia::render('model-registration', [
            'fieldTypeOptions' => $fieldTypeOptions,
        ]);
    }
}
