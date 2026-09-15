<?php

declare(strict_types=1);

use App\Models\User;
use App\Policies\UserPolicy;

it('allows view any when the user has the generated permission', function (): void {
    $user = userWithPermissions('user.viewAny');

    expect(new UserPolicy()->viewAny($user))->toBeTrue()
        ->and(new UserPolicy()->viewAny(User::factory()->create()))->toBeFalse();
});

it('allows deleting yourself without the delete permission', function (): void {
    $user = User::factory()->create();

    expect(new UserPolicy()->delete($user, $user))->toBeTrue();
});

it('requires the delete permission to delete another user', function (): void {
    $user = userWithPermissions('user.delete');
    $target = User::factory()->create();

    expect(new UserPolicy()->delete($user, $target))->toBeTrue()
        ->and(new UserPolicy()->delete(User::factory()->create(), $target))->toBeFalse();
});

it('requires impersonate permission', function (): void {
    $user = userWithPermissions('user.impersonate');

    expect(new UserPolicy()->impersonate($user))->toBeTrue()
        ->and(new UserPolicy()->impersonate(User::factory()->create()))->toBeFalse();
});
