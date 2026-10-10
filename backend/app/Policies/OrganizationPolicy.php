<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;

class OrganizationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active;
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->active;
    }

    public function create(User $user): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }
}