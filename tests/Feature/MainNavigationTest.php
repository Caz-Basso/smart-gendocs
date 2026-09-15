<?php

declare(strict_types=1);

use App\Models\User;

it('shares main navigation with authenticated users', function (): void {
    $this->actingAs(superAdmin())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('navigation.main', 2)
            ->where('navigation.main.0.label', 'Dashboard')
            ->where('navigation.main.1.label', 'Administração')
            ->has('navigation.main.1.items', 2)
        );
});

it('shares only dashboard navigation without admin permissions', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('navigation.main', 1)
            ->where('navigation.main.0.label', 'Dashboard')
            ->has('navigation.main.0.items', 1)
        );
});

it('shares empty main navigation with guests', function (): void {
    $this->get(route('login'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('session/create')
            ->where('navigation.main', [])
        );
});
