<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CopyEquipmentRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:150'],
        ];
    }
}