<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['category', 'label', 'field_type', 'options', 'required', 'sort_order', 'active', 'created_by', 'updated_by'])]
class EquipmentMasterField extends Model
{
    use HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'required' => 'boolean',
            'active' => 'boolean',
        ];
    }
}