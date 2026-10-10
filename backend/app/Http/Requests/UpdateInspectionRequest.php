<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('inspection')) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'remarks' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'inspected_on' => ['sometimes', 'required', 'date_format:Y-m-d'],
        ];
    }
}
