<?php

namespace App\Http\Controllers;

use App\Actions\EquipmentManager;
use App\Http\Requests\CopyEquipmentRequest;
use App\Http\Requests\StoreEquipmentRequest;
use App\Http\Requests\UpdateEquipmentRequest;
use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class EquipmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Equipment::class);

        $query = Equipment::query()->with(['organization', 'attributes', 'photos', 'assignedUser']);
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->query('organization_id'));
        }
        if (in_array($request->query('category'), ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'], true)) {
            $query->where('category', $request->query('category'));
        }

        return ApiResponse::ok(EquipmentResource::collection($query->orderByDesc('created_at')->get())->resolve());
    }

    public function show(Equipment $equipment): JsonResponse
    {
        Gate::authorize('view', $equipment);

        return ApiResponse::ok((new EquipmentResource($equipment->load(['organization', 'attributes', 'photos', 'assignedUser'])))->resolve());
    }

    public function store(StoreEquipmentRequest $request, EquipmentManager $manager): JsonResponse
    {
        Gate::authorize('create', Equipment::class);
        $equipment = $manager->create($request->validated(), $request->user());

        return ApiResponse::ok((new EquipmentResource($equipment))->resolve(), 201);
    }

    public function update(UpdateEquipmentRequest $request, Equipment $equipment, EquipmentManager $manager): JsonResponse
    {
        Gate::authorize('update', $equipment);
        $updated = $manager->update($equipment, $request->validated(), $request->user());

        return ApiResponse::ok((new EquipmentResource($updated))->resolve());
    }

    public function copy(CopyEquipmentRequest $request, Equipment $equipment, EquipmentManager $manager): JsonResponse
    {
        Gate::authorize('view', $equipment);
        Gate::authorize('create', Equipment::class);
        $copy = $manager->copy($equipment->load(['attributes', 'photos']), $request->validated(), $request->user());

        return ApiResponse::ok((new EquipmentResource($copy))->resolve(), 201);
    }

    public function destroy(Equipment $equipment): JsonResponse
    {
        Gate::authorize('delete', $equipment);
        $equipment->delete();

        return ApiResponse::ok(['deleted' => true]);
    }
}