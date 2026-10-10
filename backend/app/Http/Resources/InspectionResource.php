<?php

namespace App\Http\Resources;

use App\Models\InspectionItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InspectionResource extends JsonResource
{
    /** @var array<string, list<string>> keyed by template_item_id */
    private array $previousValues = [];

    /** @param  array<string, list<string>>  $previousValues */
    public function withPreviousValues(array $previousValues): static
    {
        $this->previousValues = $previousValues;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $equipment = $this->equipment;

        return [
            'id' => (string) $this->id,
            'equipment_id' => (string) $this->equipment_id,
            'equipment' => $equipment ? [
                'id' => (string) $equipment->id,
                'name' => $equipment->name,
                'equipment_code' => $equipment->equipment_code,
                'organization_name' => $equipment->organization?->name,
                'assigned_user_id' => $equipment->assigned_user_id ? (string) $equipment->assigned_user_id : null,
                'assigned_user_name' => $equipment->assignedUser?->name,
            ] : null,
            'category' => $this->category,
            'status' => $this->status,
            'inspected_on' => $this->inspected_on?->toDateString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'emailed_at' => $this->emailed_at?->toISOString(),
            'remarks' => $this->remarks,
            'created_by' => ['id' => (string) $this->created_by, 'name' => $this->creator?->name],
            'can_edit' => $request->user()?->can('update', $this->resource) ?? false,
            'can_delete' => $request->user()?->can('delete', $this->resource) ?? false,
            'items' => $this->whenLoaded('items', fn () => $this->items
                ->map(fn (InspectionItem $item) => (new InspectionItemResource($item))
                    ->withPreviousValues($item->template_item_id ? ($this->previousValues[$item->template_item_id] ?? null) : null)
                    ->resolve($request))
                ->all()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
