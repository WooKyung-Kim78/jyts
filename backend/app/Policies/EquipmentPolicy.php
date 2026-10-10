<?php

namespace App\Policies;

use App\Models\Equipment;
use App\Models\User;

class EquipmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active;
    }

    public function view(User $user, Equipment $equipment): bool
    {
        return $user->active;
    }

    public function create(User $user): bool
    {
        return $user->active && in_array($user->role, ['ADMIN', 'USER'], true);
    }

    public function update(User $user, Equipment $equipment): bool
    {
        return $user->active && in_array($user->role, ['ADMIN', 'USER'], true);
    }

    public function delete(User $user, Equipment $equipment): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }
}