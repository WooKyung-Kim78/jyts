<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

#[Fillable(['name', 'address', 'contact_name', 'contact_phone', 'contact_email', 'map_image_path', 'created_by', 'updated_by'])]
class Organization extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public function sites(): HasMany
    {
        return $this->hasMany(Site::class);
    }
}