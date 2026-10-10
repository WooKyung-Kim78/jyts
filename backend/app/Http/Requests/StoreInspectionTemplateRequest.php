<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspectionTemplateRequest extends FormRequest
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
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.inspection_item' => ['required', 'string', 'max:255'],
            'items.*.standard' => [
                Rule::prohibitedIf(fn (): bool => $this->input('category') === 'UPS'),
                Rule::requiredIf(fn (): bool => ! in_array($this->input('category'), ['UPS', 'FIRE_SUPPRESSION'], true)),
                'nullable',
                'string',
                'max:2000',
            ],
            'items.*.input_template' => [
                Rule::prohibitedIf(fn (): bool => $this->input('category') === 'FIRE_SUPPRESSION'),
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }
}