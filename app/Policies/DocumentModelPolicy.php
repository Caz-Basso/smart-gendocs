<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\DocumentModel;
use App\Models\User;

final class DocumentModelPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('super-admin');
    }

    public function view(User $user, DocumentModel $model): bool
    {
        return $user->hasRole('admin') || $user->hasRole('super-admin') || $model->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('super-admin');
    }

    public function update(User $user, DocumentModel $model): bool
    {
        return ($user->hasRole('admin') || $user->hasRole('super-admin')) && $model->user_id === $user->id;
    }

    public function delete(User $user, DocumentModel $model): bool
    {
        return ($user->hasRole('admin') || $user->hasRole('super-admin')) && $model->user_id === $user->id;
    }

    public function use(User $user, DocumentModel $model): bool
    {
        return $user->hasRole('user') || $user->hasRole('admin') || $user->hasRole('super-admin');
    }
}
