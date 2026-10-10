<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEquipmentMasterFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'])],
            'label' => ['required', 'string', 'max:120'],
            'field_type' => ['required', Rule::in(['text', 'textarea', 'number', 'date', 'select', 'checkbox'])],
            'options' => ['nullable', 'array', 'max:100'],
            'options.*' => ['required', 'string', 'max:120'],
            'required' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }
}