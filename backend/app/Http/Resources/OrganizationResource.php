<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'contact_name' => $this->contact_name,
            'contact_phone' => $request->user()?->role === 'USER'
                ? $this->maskPhone($this->contact_phone)
                : $this->contact_phone,
            'contact_email' => $this->contact_email,
            'map_image_url' => $this->map_image_path ? "/api/organizations/{$this->id}/map" : null,
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