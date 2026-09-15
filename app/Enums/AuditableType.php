<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;

enum AuditableType: string
{
    case USER = 'users';

    /**
     * @return class-string<Model&Auditable>
     */
    public function modelClass(): string
    {
        return match ($this) {
            self::USER => User::class,
        };
    }

    /**
     * @return Model&Auditable
     */
    public function resolve(string $id): Model
    {
        return $this->modelClass()::query()->with('audits')->findOrFail($id);
    }
}
