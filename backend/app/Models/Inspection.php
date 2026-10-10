<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['equipment_id', 'inspection_template_id', 'template_version', 'category', 'inspected_on', 'remarks'])]
class Inspection extends Model
{
    use HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'template_version' => 'integer',
            'inspected_on' => 'immutable_date',
            'completed_at' => 'immutable_datetime',
            'emailed_at' => 'immutable_datetime',
            'deleted_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InspectionItem::class)->orderBy('sort_order');
    }

    public function isLocked(): bool
    {
        return $this->emailed_at !== null || ! in_array($this->status, ['DRAFT', 'COMPLETED'], true);
    }
}
