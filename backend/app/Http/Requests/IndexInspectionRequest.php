<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'equipment_id' => ['nullable', 'uuid'],
            'status' => ['nullable', Rule::in(['DRAFT', 'COMPLETED', 'CANCELLED'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
