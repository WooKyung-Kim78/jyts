<?php

namespace App\Actions;

use App\Models\Equipment;
use App\Models\EquipmentAttribute;
use App\Models\EquipmentMasterField;
use App\Models\EquipmentPhoto;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class EquipmentManager
{
    /** @param array<string, mixed> $data */
    public function update(Equipment $equipment, array $data, User $actor): Equipment
    {
        return DB::transaction(function () use ($equipment, $data, $actor): Equipment {
            $attributeValues = $data['attribute_values'] ?? [];
            $customFields = $data['custom_fields'] ?? [];
            unset($data['attribute_values'], $data['custom_fields']);

            $equipment->update([
                ...$data,
                'updated_by' => $actor->id,
            ]);

            $attributes = $equipment->attributes()->get()->keyBy(fn (EquipmentAttribute $attribute) => (string) $attribute->id);
            if (array_diff(array_keys($attributeValues), $attributes->keys()->all()) !== []) {
                throw ValidationException::withMessages(['attribute_values' => '이 장비에 속하지 않은 항목이 포함되어 있습니다.']);
            }

            foreach ($attributeValues as $attributeId => $value) {
                $attributes->get($attributeId)->update(['value' => $value]);
            }

            foreach (array_values($customFields) as $index => $customField) {
                if (! empty($customField['id'])) {
                    $existing = $attributes->get($customField['id']);
                    if (! $existing || $existing->master_field_id !== null) {
                        throw ValidationException::withMessages([
                            "custom_fields.{$index}.id" => '이 장비에 속하지 않은 추가 항목입니다.',
                        ]);
                    }

                    $existing->update([
                        'label' => trim($customField['label']),
                        'value' => $customField['value'] ?? null,
                    ]);
                    continue;
                }

                $equipment->attributes()->create([
                    'master_field_id' => null,
                    'label' => trim($customField['label']),
                    'field_type' => 'text',
                    'options' => null,
                    'value' => $customField['value'] ?? null,
                    'sort_order' => $attributes->count() + $index,
                ]);
            }

            return $equipment->load(['organization', 'attributes', 'photos', 'assignedUser']);
        });
    }

    /** @param array<string, mixed> $data */
    public function create(array $data, User $actor): Equipment
    {
        $storedPaths = [];

        try {
            return DB::transaction(function () use ($data, $actor, &$storedPaths): Equipment {
                $masterValues = $data['master_values'] ?? [];
                $customFields = $data['custom_fields'] ?? [];
                $photos = $data['photos'] ?? [];
                unset($data['master_values'], $data['custom_fields'], $data['photos']);

                $equipment = Equipment::query()->create([
                    ...$data,
                    'created_by' => $actor->id,
                    'updated_by' => $actor->id,
                ]);

                $fields = EquipmentMasterField::query()
                    ->where('category', $equipment->category)
                    ->where('active', true)
                    ->orderBy('sort_order')
                    ->orderBy('created_at')
                    ->get();
                $submittedIds = array_keys($masterValues);
                $knownIds = $fields->modelKeys();

                if (array_diff($submittedIds, $knownIds) !== []) {
                    throw ValidationException::withMessages(['master_values' => '선택한 항목이 현재 장비 종류의 마스터와 일치하지 않습니다.']);
                }

            foreach ($fields as $field) {
                $value = $masterValues[$field->id] ?? null;
                if ($field->required && ($value === null || trim($value) === '')) {
                    throw ValidationException::withMessages(["master_values.{$field->id}" => "{$field->label} 항목은 필수입니다."]);
                }

                $this->validateFieldValue($field, $value);
                $equipment->attributes()->create([
                    'master_field_id' => $field->id,
                    'label' => $field->label,
                    'field_type' => $field->field_type,
                    'options' => $field->options,
                    'value' => $value,
                    'sort_order' => $field->sort_order,
                ]);
            }

            foreach (array_values($customFields) as $index => $customField) {
                $equipment->attributes()->create([
                    'master_field_id' => null,
                    'label' => trim($customField['label']),
                    'field_type' => 'text',
                    'options' => null,
                    'value' => $customField['value'] ?? null,
                    'sort_order' => $fields->count() + $index,
                ]);
            }

            foreach ($photos as $image) {
                $extension = match ($image->getMimeType()) {
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    default => throw ValidationException::withMessages(['photos' => '지원하지 않는 이미지 형식입니다.']),
                };
                $path = "equipment/{$equipment->id}/photos/".Str::uuid().".{$extension}";
                if (! Storage::disk('local')->putFileAs(dirname($path), $image, basename($path))) {
                    throw new RuntimeException('Unable to store equipment photo.');
                }
                $storedPaths[] = $path;
                $equipment->photos()->create([
                    'storage_path' => $path,
                    'mime_type' => $image->getMimeType(),
                    'size_bytes' => $image->getSize(),
                    'created_by' => $actor->id,
                ]);
            }

            return $equipment->load(['organization', 'attributes', 'photos', 'assignedUser']);
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($storedPaths);
            throw $exception;
        }
    }

    /** @param array<string, mixed> $data */
    public function copy(Equipment $source, array $data, User $actor): Equipment
    {
        if ($source->organization_id === $data['organization_id']) {
            throw ValidationException::withMessages([
                'organization_id' => '복제할 고객사는 원본 장비의 고객사와 달라야 합니다.',
            ]);
        }

        $copiedPaths = [];

        try {
            return DB::transaction(function () use ($source, $data, $actor, &$copiedPaths): Equipment {
                $copy = Equipment::query()->create([
                    'organization_id' => $data['organization_id'],
                    'copied_from_id' => $source->id,
                    'equipment_code' => $data['equipment_code'],
                    'name' => $data['name'] ?? $source->name,
                    'category' => $source->category,
                    'status' => $source->status,
                    'inspection_cycle' => $source->inspection_cycle,
                    'specifics' => $source->specifics,
                    'created_by' => $actor->id,
                    'updated_by' => $actor->id,
                ]);

                foreach ($source->attributes as $attribute) {
                    $copy->attributes()->create([
                        'master_field_id' => $attribute->master_field_id,
                        'label' => $attribute->label,
                        'field_type' => $attribute->field_type,
                        'options' => $attribute->options,
                        'value' => $attribute->value,
                        'sort_order' => $attribute->sort_order,
                    ]);
                }

                foreach ($source->photos as $photo) {
                    $prefix = "equipment/{$source->id}/photos/";
                    if (! str_starts_with($photo->storage_path, $prefix)) {
                        throw new RuntimeException('Invalid equipment photo storage path.');
                    }

                    $extension = match ($photo->mime_type) {
                        'image/jpeg' => 'jpg',
                        'image/png' => 'png',
                        'image/webp' => 'webp',
                        default => throw new RuntimeException('Unsupported equipment photo MIME type.'),
                    };
                    $newPath = "equipment/{$copy->id}/photos/".Str::uuid().".{$extension}";

                    if (! Storage::disk('local')->copy($photo->storage_path, $newPath)) {
                        throw new RuntimeException('Unable to copy equipment photo.');
                    }
                    $copiedPaths[] = $newPath;

                    $copy->photos()->create([
                        'storage_path' => $newPath,
                        'mime_type' => $photo->mime_type,
                        'size_bytes' => $photo->size_bytes,
                        'created_by' => $actor->id,
                    ]);
                }

                return $copy->load(['organization', 'attributes', 'photos', 'assignedUser']);
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($copiedPaths);
            throw $exception;
        }
    }

    private function validateFieldValue(EquipmentMasterField $field, ?string $value): void
    {
        if ($value === null || trim($value) === '') {
            return;
        }

        $valid = match ($field->field_type) {
            'number' => is_numeric($value),
            'date' => (bool) preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $value),
            'select' => in_array($value, $field->options ?? [], true),
            'checkbox' => in_array($value, ['0', '1'], true),
            default => true,
        };

        if (! $valid) {
            throw ValidationException::withMessages(["master_values.{$field->id}" => "{$field->label} 항목의 값이 올바르지 않습니다."]);
        }
    }
}