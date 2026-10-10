<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEquipmentMasterFieldRequest;
use App\Http\Resources\EquipmentMasterFieldResource;
use App\Models\EquipmentMasterField;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class EquipmentMasterFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', EquipmentMasterField::class);

        $fields = EquipmentMasterField::query()->where('active', true);
        $category = $request->query('category');
        if (in_array($category, ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'], true)) {
            $fields->where('category', $category);
        }

        return ApiResponse::ok(EquipmentMasterFieldResource::collection(
            $fields->orderBy('category')->orderBy('sort_order')->orderBy('created_at')->get()
        )->resolve());
    }

    public function store(StoreEquipmentMasterFieldRequest $request): JsonResponse
    {
        Gate::authorize('create', EquipmentMasterField::class);

        $field = EquipmentMasterField::query()->create([
            ...$request->validated(),
            'options' => $request->validated('field_type') === 'select' ? $request->validated('options', []) : null,
            'required' => $request->boolean('required'),
            'active' => true,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return ApiResponse::ok((new EquipmentMasterFieldResource($field))->resolve(), 201);
    }

    public function update(StoreEquipmentMasterFieldRequest $request, EquipmentMasterField $equipmentMasterField): JsonResponse
    {
        Gate::authorize('update', $equipmentMasterField);

        $equipmentMasterField->update([
            ...$request->validated(),
            'options' => $request->validated('field_type') === 'select' ? $request->validated('options', []) : null,
            'required' => $request->boolean('required'),
            'updated_by' => $request->user()->id,
        ]);

        return ApiResponse::ok((new EquipmentMasterFieldResource($equipmentMasterField))->resolve());
    }

    public function destroy(EquipmentMasterField $equipmentMasterField): JsonResponse
    {
        Gate::authorize('delete', $equipmentMasterField);
        $equipmentMasterField->delete();

        return ApiResponse::ok(['deleted' => true]);
    }
}