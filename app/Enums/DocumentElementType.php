<?php

declare(strict_types=1);

namespace App\Enums;

enum DocumentElementType: string
{
    case Header = 'header';
    case Footer = 'footer';

    public function label(): string
    {
        return match ($this) {
            self::Header => 'Cabeçalho',
            self::Footer => 'Rodapé',
        };
    }
}

