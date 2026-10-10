<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentPhotoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'url' => "/api/equipment-photos/{$this->id}",
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}