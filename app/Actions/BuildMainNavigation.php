<?php

declare(strict_types=1);

namespace App\Actions;

use App\Models\User;
use Spatie\Permission\Models\Role;

final readonly class BuildMainNavigation
{
    /**
     * Build the main navigation groups for the given user.
     *
     * @return list<array{label: string, icon: string, items: list<array{title: string, href: string, icon: string}>}>
     */
    public function handle(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        /** @var array<string, list<array{title: string, href: string, icon: string}>> $visibleByGroup */
        $visibleByGroup = [];

        foreach ($this->catalog() as $item) {
            if (! $this->isVisible($user, $item['ability'])) {
                continue;
            }

            $visibleByGroup[$item['group']][] = [
                'title' => $item['title'],
                'href' => $item['href'],
                'icon' => $item['icon'],
            ];
        }

        $groups = [];

        foreach ($this->groupOrder() as $label) {
            if (! isset($visibleByGroup[$label])) {
                continue;
            }

            $groups[] = [
                'label' => $label,
                'icon' => $this->groupIcon($label),
                'items' => $visibleByGroup[$label],
            ];
        }

        return $groups;
    }

    /**
     * @return list<string>
     */
    private function groupOrder(): array
    {
        return [
            'Dashboard',
            'Administração',
        ];
    }

    private function groupIcon(string $label): string
    {
        return match ($label) {
            'Dashboard' => 'LayoutGrid',
            'Administração' => 'Shield',
            default => 'LayoutGrid',
        };
    }

    /**
     * @return list<array{group: string, title: string, href: string, icon: string, ability: array{0: string, 1: class-string}|null}>
     */
    private function catalog(): array
    {
        return [
            [
                'group' => 'Dashboard',
                'title' => 'Dashboard',
                'href' => route('dashboard', absolute: false),
                'icon' => 'LayoutGrid',
                'ability' => null,
            ],
            [
                'group' => 'Administração',
                'title' => 'Usuários',
                'href' => route('users.index', absolute: false),
                'icon' => 'Users',
                'ability' => ['viewAny', User::class],
            ],
            [
                'group' => 'Administração',
                'title' => 'Perfis',
                'href' => route('roles.index', absolute: false),
                'icon' => 'Shield',
                'ability' => ['viewAny', Role::class],
            ],
        ];
    }

    /**
     * @param  array{0: string, 1: class-string}|null  $ability
     */
    private function isVisible(User $user, ?array $ability): bool
    {
        if ($ability === null) {
            return true;
        }

        return $user->can($ability[0], $ability[1]);
    }
}
