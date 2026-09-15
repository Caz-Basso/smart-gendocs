<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\GetAudits;
use App\Enums\AuditableType;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use OwenIt\Auditing\Models\Audit;

final readonly class AuditController
{
    public function __construct(
        private GetAudits $getAudits,
    ) {}

    /**
     * Display a listing of audits for the given auditable model.
     */
    public function show(string $type, string $id): Response
    {
        $auditableType = AuditableType::tryFrom($type) ?? throw new InvalidArgumentException("Auditable type {$type} not found");

        $model = $auditableType->resolve($id);

        Gate::authorize('viewAudits', $model);

        return Inertia::render('audit/show', [
            'id' => $model->getKey(),
            'type' => $auditableType->value,
            'audits' => $this->getAudits->handle($auditableType->value, $id)
                ->map(fn (Audit $audit): array => [
                    'id' => $audit->getKey(),
                    'event' => $audit->event,
                    'responsible' => $audit->user instanceof User ? $audit->user->name : null,
                    'old_values' => $audit->old_values,
                    'new_values' => $audit->new_values,
                    'created_at' => $audit->created_at,
                ]),
        ]);
    }
}
