<?php

namespace App\Http\Resources;

use App\Support\InspectionInputTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InspectionItemResource extends JsonResource
{
    /** @var list<string>|null */
    private ?array $previousValues = null;

    /** @param  list<string>|null  $previousValues */
    public function withPreviousValues(?array $previousValues): static
    {
        $this->previousValues = $previousValues;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'template_item_id' => $this->template_item_id ? (string) $this->template_item_id : null,
            'sort_order' => $this->sort_order,
            'inspection_item' => $this->inspection_item,
            'standard' => $this->standard,
            'input_template' => $this->input_template,
            'input_types' => InspectionInputTemplate::fieldTypes($this->input_template),
            'input_values' => array_values($this->input_values ?? []),
            'previous_values' => $this->previousValues,
            'result' => $this->result,
            'remarks' => $this->remarks,
            'saved_at' => $this->saved_at?->toISOString(),
            'photos' => InspectionItemPhotoResource::collection($this->whenLoaded('photos'))->resolve(),
        ];
    }
}
