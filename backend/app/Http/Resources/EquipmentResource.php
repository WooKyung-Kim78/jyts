<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'organization_id' => (string) $this->organization_id,
            'organization_name' => $this->organization?->name,
            'organization_contact_name' => $this->organization?->contact_name,
            'organization_contact_phone' => $request->user()?->role === 'USER'
                ? $this->maskPhone($this->organization?->contact_phone)
                : $this->organization?->contact_phone,
            'organization_address' => $this->organization?->address,
            'organization_map_image_url' => $this->organization?->map_image_path
                ? "/api/organizations/{$this->organization_id}/map"
                : null,
            'copied_from_id' => $this->copied_from_id ? (string) $this->copied_from_id : null,
            'equipment_code' => $this->equipment_code,
            'name' => $this->name,
            'category' => $this->category,
            'status' => $this->status,
            'specifics' => $this->specifics,
            'assigned_user_id' => $this->assigned_user_id ? (string) $this->assigned_user_id : null,
            'assigned_user' => $this->whenLoaded('assignedUser', fn () => $this->assignedUser ? [
                'id' => (string) $this->assignedUser->id,
                'name' => $this->assignedUser->name,
                'active' => $this->assignedUser->active,
            ] : null),
            'attributes' => EquipmentAttributeResource::collection($this->whenLoaded('attributes'))->resolve(),
            'photos' => EquipmentPhotoResource::collection($this->whenLoaded('photos'))->resolve(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function maskPhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone) ?? '';

        return strlen($digits) >= 4 ? '***-****-'.substr($digits, -4) : '****';
    }

}