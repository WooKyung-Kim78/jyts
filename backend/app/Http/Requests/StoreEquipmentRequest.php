<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'organization_id' => ['required', 'uuid', Rule::exists('organizations', 'id')->whereNull('deleted_at')],
            'equipment_code' => ['required', 'string', 'max:60', Rule::unique('equipment', 'equipment_code')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', Rule::in(['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'])],
            'inspection_cycle' => ['required', Rule::in(Equipment::INSPECTION_CYCLES)],
            'assigned_user_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where('active', true)],
            'specifics' => ['nullable', 'string', 'max:20000'],
            'master_values' => ['sometimes', 'array', 'max:100'],
            'master_values.*' => ['nullable', 'string', 'max:2000'],
            'custom_fields' => ['sometimes', 'array', 'max:30'],
            'custom_fields.*.label' => ['required', 'string', 'max:120'],
            'custom_fields.*.value' => ['nullable', 'string', 'max:2000'],
            'photos' => ['sometimes', 'array', 'max:20'],
            'photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ];
    }
}