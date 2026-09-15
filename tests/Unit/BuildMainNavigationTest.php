<?php

declare(strict_types=1);

use App\Actions\BuildMainNavigation;
use App\Models\User;

it('returns empty navigation for guests', function (): void {
    $groups = resolve(BuildMainNavigation::class)->handle(null);

    expect($groups)->toBe([]);
});

it('shows dashboard for authenticated users without admin permissions', function (): void {
    $groups = resolve(BuildMainNavigation::class)->handle(User::factory()->create());

    expect($groups)->toHaveCount(1)
        ->and($groups[0])->toMatchArray([
            'label' => 'Dashboard',
            'icon' => 'LayoutGrid',
        ])
        ->and($groups[0]['items'])->toBe([
            ['title' => 'Dashboard', 'href' => '/dashboard', 'icon' => 'LayoutGrid'],
        ]);
});

it('shows users and roles for super-admin', function (): void {
    $titles = collect(resolve(BuildMainNavigation::class)->handle(superAdmin()))
        ->flatMap(fn (array $group): array => array_column($group['items'], 'title'))
        ->all();

    expect($titles)->toBe(['Dashboard', 'Usuários', 'Perfis']);
});

it('shows users without roles when only user.viewAny is granted', function (): void {
    $titles = collect(resolve(BuildMainNavigation::class)->handle(userWithPermissions('user.viewAny')))
        ->flatMap(fn (array $group): array => array_column($group['items'], 'title'))
        ->all();

    expect($titles)->toContain('Dashboard', 'Usuários')
        ->and($titles)->not->toContain('Perfis');
});

it('shows roles without users when only role.viewAny is granted', function (): void {
    $titles = collect(resolve(BuildMainNavigation::class)->handle(userWithPermissions('role.viewAny')))
        ->flatMap(fn (array $group): array => array_column($group['items'], 'title'))
        ->all();

    expect($titles)->toContain('Dashboard', 'Perfis')
        ->and($titles)->not->toContain('Usuários');
});
