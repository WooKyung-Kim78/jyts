<?php

namespace App\Http\Controllers;

use App\Actions\InspectionManager;
use App\Http\Requests\IndexInspectionRequest;
use App\Http\Requests\SaveInspectionItemRequest;
use App\Http\Requests\StoreInspectionRequest;
use App\Http\Requests\UpdateInspectionRequest;
use App\Http\Resources\InspectionItemResource;
use App\Http\Resources\InspectionResource;
use App\Models\Equipment;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InspectionController extends Controller
{
    private const RELATIONS = ['equipment.organization', 'equipment.assignedUser', 'creator'];

    private const PER_PAGE = 100;

    public function index(IndexInspectionRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Inspection::class);

        $page = Inspection::query()
            ->with(self::RELATIONS)
            ->when($request->validated('equipment_id'), fn ($query, $id) => $query->where('equipment_id', $id))
            ->when($request->validated('status'), fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('inspected_on')
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE);

        return ApiResponse::ok([
            'items' => InspectionResource::collection($page->getCollection())->resolve(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function store(StoreInspectionRequest $request, InspectionManager $manager): JsonResponse
    {
        Gate::authorize('create', Inspection::class);
        $equipment = Equipment::query()->findOrFail($request->validated('equipment_id'));
        Gate::authorize('view', $equipment);

        [$inspection, $created] = $manager->start($equipment, $request->user());

        return ApiResponse::ok($this->detail($inspection, $request), $created ? 201 : 200);
    }

    public function show(Request $request, Inspection $inspection): JsonResponse
    {
        Gate::authorize('view', $inspection);

        return ApiResponse::ok($this->detail($inspection, $request));
    }

    public function update(UpdateInspectionRequest $request, Inspection $inspection, InspectionManager $manager): JsonResponse
    {
        Gate::authorize('update', $inspection);
        $manager->update($inspection, $request->validated(), $request->user());

        return ApiResponse::ok($this->detail($inspection, $request));
    }

    public function destroy(Request $request, Inspection $inspection, InspectionManager $manager): JsonResponse
    {
        Gate::authorize('delete', $inspection);
        $manager->delete($inspection, $request->user());

        return ApiResponse::ok(['deleted' => true]);
    }

    public function updateItem(SaveInspectionItemRequest $request, Inspection $inspection, InspectionItem $item, InspectionManager $manager): JsonResponse
    {
        Gate::authorize('update', $inspection);
        $saved = $manager->saveItem($item, $request->validated(), $request->user());

        return ApiResponse::ok((new InspectionItemResource($saved))->resolve($request));
    }

    public function complete(Request $request, Inspection $inspection, InspectionManager $manager): JsonResponse
    {
        Gate::authorize('update', $inspection);
        $manager->complete($inspection, $request->user());

        return ApiResponse::ok($this->detail($inspection, $request));
    }

    /** @return array<string, mixed> */
    private function detail(Inspection $inspection, Request $request): array
    {
        $inspection->load([...self::RELATIONS, 'items.photos']);

        $previous = Inspection::query()
            ->where('equipment_id', $inspection->equipment_id)
            ->where('status', 'COMPLETED')
            ->whereKeyNot($inspection->id)
            ->where('created_at', '<', $inspection->created_at)
            ->orderByDesc('completed_at')
            ->with('items')
            ->first();
        $previousValues = $previous?->items
            ->filter(fn (InspectionItem $item) => $item->template_item_id !== null)
            ->mapWithKeys(fn (InspectionItem $item) => [(string) $item->template_item_id => array_values($item->input_values ?? [])])
            ->all() ?? [];

        return (new InspectionResource($inspection))->withPreviousValues($previousValues)->resolve($request);
    }
}
