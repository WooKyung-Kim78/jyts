<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['equipment_id', 'storage_path', 'mime_type', 'size_bytes', 'created_by'])]
class EquipmentPhoto extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected function casts(): array
    {
        return ['size_bytes' => 'integer', 'created_at' => 'immutable_datetime'];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }
}