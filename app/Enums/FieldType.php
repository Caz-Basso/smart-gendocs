<?php

declare(strict_types=1);

namespace App\Enums;

enum FieldType: string
{
    case TEXT = 'text';
    case TEXTAREA = 'textarea';
    case NUMBER = 'number';
    case DATE = 'date';
    case CURRENCY = 'currency';

    public function label(): string
    {
        return match($this) {
            self::TEXT => 'Texto',
            self::TEXTAREA => 'Texto longo',
            self::NUMBER => 'Número',
            self::DATE => 'Data',
            self::CURRENCY => 'Moeda',
        };
    }
}
