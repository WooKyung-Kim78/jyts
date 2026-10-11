<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $equipment = $this->route('equipment');

        return [
            'organization_id' => ['required', 'uuid', Rule::exists('organizations', 'id')->whereNull('deleted_at')],
            'equipment_code' => [
                'required',
                'string',
                'max:60',
                Rule::unique('equipment', 'equipment_code')->whereNull('deleted_at')->ignore($equipment?->id),
            ],
            'name' => ['required', 'string', 'max:150'],
            'inspection_cycle' => ['sometimes', 'required', Rule::in(Equipment::INSPECTION_CYCLES)],
            'assigned_user_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('active', true)
                    ->orWhere('id', $equipment?->assigned_user_id)),
            ],
            'specifics' => ['nullable', 'string', 'max:20000'],
            'attribute_values' => ['sometimes', 'array', 'max:100'],
            'attribute_values.*' => ['nullable', 'string', 'max:2000'],
            'custom_fields' => ['sometimes', 'array', 'max:30'],
            'custom_fields.*.id' => ['sometimes', 'uuid'],
            'custom_fields.*.label' => ['required', 'string', 'max:120'],
            'custom_fields.*.value' => ['nullable', 'string', 'max:2000'],
        ];
    }
}