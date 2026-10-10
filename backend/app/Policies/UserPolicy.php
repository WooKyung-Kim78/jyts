<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->active && $actor->role === 'ADMIN';
    }

    public function viewActive(User $actor): bool
    {
        return $actor->active;
    }

    public function create(User $actor): bool
    {
        return $actor->active && $actor->role === 'ADMIN';
    }

    public function update(User $actor, User $employee): bool
    {
        return $actor->active && $actor->role === 'ADMIN';
    }

    public function terminate(User $actor, User $employee): bool
    {
        return $actor->active && $actor->role === 'ADMIN';
    }

    public function restore(User $actor, User $employee): bool
    {
        return $actor->active && $actor->role === 'ADMIN';
    }
}