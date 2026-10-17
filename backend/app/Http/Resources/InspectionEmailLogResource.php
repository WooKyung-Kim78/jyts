<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InspectionEmailLogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'sent_to' => $this->sent_to,
            'sent_at' => $this->sent_at?->toISOString(),
            'sent_by' => ['id' => (string) $this->sent_by, 'name' => $this->sender?->name],
        ];
    }
}
