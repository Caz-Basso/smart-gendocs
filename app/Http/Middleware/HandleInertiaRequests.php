<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Actions\BuildMainNavigation;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Lab404\Impersonate\Services\ImpersonateManager;
use Spatie\Permission\Models\Role;

final class HandleInertiaRequests extends Middleware
{
    /**
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    public function __construct(private readonly BuildMainNavigation $buildMainNavigation)
    {
        //
    }

    /**
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user instanceof User) {
            $user->load('roles');
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'impersonating' => resolve(ImpersonateManager::class)->isImpersonating(),
                'can' => [
                    'users' => [
                        'viewAny' => $user instanceof User && $user->can('viewAny', User::class),
                        'create' => $user instanceof User && $user->can('create', User::class),
                        'update' => $user instanceof User && $user->can('user.update'),
                        'manageRoles' => $user instanceof User && $user->can('user.manageRoles'),
                        'changeStatus' => $user instanceof User && $user->can('user.changeStatus'),
                        'delete' => $user instanceof User && $user->can('user.delete'),
                        'impersonate' => $user instanceof User && $user->can('user.impersonate'),
                        'viewAudits' => $user instanceof User && $user->can('user.viewAudits'),
                    ],
                    'roles' => [
                        'viewAny' => $user instanceof User && $user->can('viewAny', Role::class),
                        'create' => $user instanceof User && $user->can('create', Role::class),
                        'update' => $user instanceof User && $user->can('role.update'),
                        'delete' => $user instanceof User && $user->can('role.delete'),
                    ],
                ],
            ],
            'navigation' => [
                'main' => $this->buildMainNavigation->handle($user instanceof User ? $user : null),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
