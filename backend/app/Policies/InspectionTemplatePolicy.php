<?php

namespace App\Policies;

use App\Models\InspectionTemplate;
use App\Models\User;

class InspectionTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->active;
    }

    public function create(User $user): bool
    {
        return $user->active && $user->role === 'ADMIN';
    }
}