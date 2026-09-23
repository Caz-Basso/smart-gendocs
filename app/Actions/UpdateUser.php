<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class UpdateUser
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(User $user, array $attributes): void
    {
        $roleName = $attributes['role'] ?? null;
        unset($attributes['role']);

        $emailChanged = isset($attributes['email']) && $user->email !== $attributes['email'];

        DB::transaction(function () use ($user, $attributes, $emailChanged, $roleName): void {
            $user->update([
                ...$attributes,
                ...($emailChanged ? ['email_verified_at' => null] : []),
            ]);

            if (is_string($roleName)) {
                $user->syncRoles($roleName);
            }
        });

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }
    }
}
