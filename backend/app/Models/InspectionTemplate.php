<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['category', 'version', 'created_by'])]
class InspectionTemplate extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(InspectionTemplateItem::class)->orderBy('sort_order');
    }
}