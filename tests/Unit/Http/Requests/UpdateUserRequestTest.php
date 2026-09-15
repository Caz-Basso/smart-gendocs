<?php

declare(strict_types=1);

use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Validation\Rules\Unique;

it('defines validation rules for the authenticated user', function (): void {
    $user = User::factory()->create([
        'email' => 'profile@example.com',
    ]);

    $request = UpdateUserRequest::create(
        '/settings/profile',
        'PATCH',
        [
            'name' => 'Test User',
            'email' => 'profile@example.com',
        ],
    );

    $request->setUserResolver(fn (): User => $user);

    $rules = $request->rules();

    expect($rules)->toHaveKeys(['name', 'email'])
        ->and($rules['name'])->toBe(['required', 'string', 'max:255'])
        ->and($rules['email'])->toContain('required', 'string', 'lowercase', 'email', 'max:255')
        ->and(
            collect($rules['email'])
                ->filter(fn (mixed $rule): bool => $rule instanceof Unique)
                ->count()
        )->toBe(1);
});

it('requires an authenticated application user', function (): void {
    $request = UpdateUserRequest::create(
        '/settings/profile',
        'PATCH',
        [
            'name' => 'Test User',
            'email' => 'profile@example.com',
        ],
    );

    $request->setUserResolver(fn (): null => null);

    expect(fn (): array => $request->rules())
        ->toThrow(UnexpectedValueException::class);
});
