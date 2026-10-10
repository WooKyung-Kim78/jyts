<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'username' => strtolower(trim((string) $this->input('username'))),
            'email' => $this->filled('email') ? mb_strtolower(trim((string) $this->input('email'))) : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $employee = $this->route('employee');

        return [
            'username' => ['required', 'string', 'regex:/\A[a-zA-Z]{5}\z/', Rule::unique('users', 'username')->ignore($employee?->id)],
            'email' => ['nullable', 'email', 'max:254', Rule::unique('users', 'email')->ignore($employee?->id)],
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', Rule::in(['ADMIN', 'USER'])],
        ];
    }
}