<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentMasterFieldResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'category' => $this->category,
            'label' => $this->label,
            'field_type' => $this->field_type,
            'options' => $this->options ?? [],
            'required' => $this->required,
            'sort_order' => $this->sort_order,
            'active' => $this->active,
        ];
    }
}