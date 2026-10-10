<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InspectionTemplateItemResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'inspection_item' => $this->inspection_item,
            'standard' => $this->standard,
            'input_template' => $this->input_template ?? $this->legacyInputTemplate(),
            'input_fields' => $this->input_fields ?? [],
            'result_options' => ['불량', '양호'],
            'sort_order' => $this->sort_order,
        ];
    }

    private function legacyInputTemplate(): string
    {
        return collect($this->input_fields ?? [])->map(function (array $field): string {
            $label = $field['label'] ?? '';
            $unit = $field['unit'] ?? '';

            return ($label !== '' ? "{$label}:" : '').'{text}'.($unit !== '' ? " {$unit}" : '');
        })->implode(' ');
    }
}