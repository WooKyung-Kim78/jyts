<?php

namespace App\Http\Requests;

use App\Models\InspectionItem;
use App\Support\InspectionInputTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveInspectionItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('inspection')) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'input_values' => ['present', 'array', 'max:50'],
            'input_values.*' => ['nullable', 'string', 'max:100'],
            'result' => ['nullable', Rule::in(['GOOD', 'BAD'])],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $item = $this->route('item');
            if (! $item instanceof InspectionItem || $validator->errors()->isNotEmpty()) {
                return;
            }

            $types = InspectionInputTemplate::fieldTypes($item->input_template);
            $values = array_values((array) $this->input('input_values', []));
            if (count($values) !== count($types)) {
                $validator->errors()->add('input_values', '입력칸 개수가 점검항목과 일치하지 않습니다.');

                return;
            }

            foreach ($types as $index => $type) {
                $value = trim((string) ($values[$index] ?? ''));
                if ($type === 'num' && $value !== '' && ! preg_match(InspectionInputTemplate::NUMBER_PATTERN, $value)) {
                    $validator->errors()->add("input_values.{$index}", '숫자만 입력하세요.');
                }
            }

            if ($item->inspection?->status === 'COMPLETED' && $this->input('result') === null) {
                $validator->errors()->add('result', '완료된 점검은 결과를 비울 수 없습니다.');
            }
        }];
    }
}
