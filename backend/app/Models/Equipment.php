<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['organization_id', 'copied_from_id', 'equipment_code', 'name', 'category', 'status', 'specifics', 'assigned_user_id', 'created_by', 'updated_by'])]
class Equipment extends Model
{
    use HasUuids, SoftDeletes;

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function copiedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'copied_from_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(EquipmentAttribute::class)->orderBy('sort_order');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(EquipmentPhoto::class)->orderBy('created_at');
    }
}