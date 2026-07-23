<?php

declare(strict_types=1);

use App\Models\User;

it('renders audits for an auditable user', function (): void {
    $authenticated = User::factory()->create();
    $target = User::factory()->create();

    $response = $this->actingAs($authenticated)
        ->get(route('audit.show', ['type' => 'users', 'id' => $target->id]));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('audit/show')
            ->where('type', 'users')
            ->where('id', $target->id)
            ->has('audits')
        );
});

it('requires authentication to view audits', function (): void {
    $target = User::factory()->create();

    $response = $this->get(route('audit.show', ['type' => 'users', 'id' => $target->id]));

    $response->assertRedirectToRoute('login');
});

it('returns not found for unknown auditable types', function (): void {
    $authenticated = User::factory()->create();

    $response = $this->actingAs($authenticated)
        ->get(route('audit.show', ['type' => 'widgets', 'id' => $authenticated->id]));

    $response->assertNotFound();
});

it('returns not found when the auditable model does not exist', function (): void {
    $authenticated = User::factory()->create();

    $response = $this->actingAs($authenticated)
        ->get(route('audit.show', ['type' => 'users', 'id' => (string) str()->uuid()]));

    $response->assertNotFound();
});
