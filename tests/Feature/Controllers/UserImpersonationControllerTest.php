<?php

declare(strict_types=1);

use App\Models\User;

it('lets an authenticated user impersonate another user', function (): void {
    $impersonator = User::factory()->create();
    $target = User::factory()->create();

    $response = $this->actingAs($impersonator)
        ->post(route('users.impersonate', $target));

    $response->assertRedirectToRoute('dashboard');

    $this->assertAuthenticatedAs($target);
    expect(session('impersonated_by'))->toBe($impersonator->getKey());
});

it('cannot impersonate yourself', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('users.impersonate', $user));

    $response->assertForbidden();
    expect(session()->has('impersonated_by'))->toBeFalse();
});

it('cannot impersonate while already impersonating', function (): void {
    $impersonator = User::factory()->create();
    $target = User::factory()->create();

    $response = $this->actingAs($impersonator)
        ->withSession(['impersonated_by' => $impersonator->getKey()])
        ->post(route('users.impersonate', $target));

    $response->assertForbidden();
});

it('requires authentication to impersonate', function (): void {
    $target = User::factory()->create();

    $response = $this->post(route('users.impersonate', $target));

    $response->assertRedirectToRoute('login');
});

it('lets an impersonator stop impersonating', function (): void {
    $impersonator = User::factory()->create();
    $target = User::factory()->create();

    $this->actingAs($impersonator)
        ->post(route('users.impersonate', $target))
        ->assertRedirectToRoute('dashboard');

    $response = $this->delete(route('users.impersonate.stop'));

    $response->assertRedirectToRoute('users.index');

    $this->assertAuthenticatedAs($impersonator);
    expect(session()->has('impersonated_by'))->toBeFalse();
});
