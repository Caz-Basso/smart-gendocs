<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\AuditableType;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final readonly class GetAudits
{
    public function handle(string $type, string $id): Collection
    {
        $auditableType = AuditableType::tryFrom($type) ?? throw new InvalidArgumentException("Auditable type {$type} not found");

        $model = $auditableType->resolve($id);

        return $model->audits()->latest()->get();
    }
}
