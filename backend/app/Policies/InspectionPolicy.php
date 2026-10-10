<?php

namespace App\Policies;

use App\Models\Inspection;
use App\Models\User;

class InspectionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active;
    }

    public function view(User $user, Inspection $inspection): bool
    {
        return $user->active;
    }

    public function create(User $user): bool
    {
        return $user->active && in_array($user->role, ['ADMIN', 'USER'], true);
    }

    // Editable by the author or an ADMIN until the report e-mail is sent.
    public function update(User $user, Inspection $inspection): bool
    {
        return $user->active
            && ! $inspection->isLocked()
            && ($user->role === 'ADMIN' || (int) $inspection->created_by === (int) $user->id);
    }

    // Same rule as editing: DRAFT or COMPLETED, before the report e-mail is sent.
    public function delete(User $user, Inspection $inspection): bool
    {
        return $this->update($user, $inspection);
    }
}
