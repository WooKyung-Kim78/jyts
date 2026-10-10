<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['equipment_id', 'master_field_id', 'label', 'field_type', 'options', 'value', 'sort_order'])]
class EquipmentAttribute extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['options' => 'array'];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }
}