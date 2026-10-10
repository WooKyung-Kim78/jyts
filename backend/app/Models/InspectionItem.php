<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['template_item_id', 'sort_order', 'inspection_item', 'standard', 'input_template', 'input_values', 'result', 'remarks'])]
class InspectionItem extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'input_values' => 'array',
            'saved_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(InspectionItemPhoto::class)->orderBy('created_at');
    }
}
