<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inspection_template_id', 'inspection_item', 'standard', 'input_template', 'input_fields', 'sort_order'])]
class InspectionTemplateItem extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected function casts(): array
    {
        return ['input_fields' => 'array'];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(InspectionTemplate::class, 'inspection_template_id');
    }
}