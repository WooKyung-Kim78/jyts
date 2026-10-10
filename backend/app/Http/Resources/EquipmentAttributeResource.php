<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentAttributeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'master_field_id' => $this->master_field_id ? (string) $this->master_field_id : null,
            'label' => $this->label,
            'field_type' => $this->field_type,
            'options' => $this->options ?? [],
            'value' => $this->value,
            'sort_order' => $this->sort_order,
        ];
    }
}