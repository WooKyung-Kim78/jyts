<?php

namespace App\Policies;

use App\Models\EquipmentMasterField;
use App\Models\User;

class EquipmentMasterFieldPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active;
    }

    public function create(User $user): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }

    public function update(User $user, EquipmentMasterField $field): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }

    public function delete(User $user, EquipmentMasterField $field): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }
}