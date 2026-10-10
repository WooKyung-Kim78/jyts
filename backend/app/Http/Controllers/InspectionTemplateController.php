<?php

namespace App\Http\Controllers;

use App\Http\Requests\IndexInspectionTemplateRequest;
use App\Http\Requests\StoreInspectionTemplateRequest;
use App\Http\Resources\InspectionTemplateResource;
use App\Models\InspectionTemplate;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class InspectionTemplateController extends Controller
{
    public function index(IndexInspectionTemplateRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', InspectionTemplate::class);

        $templates = InspectionTemplate::query()
            ->with('items')
            ->when($request->validated('category'), fn ($query, $category) => $query->where('category', $category))
            ->whereNotExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('inspection_templates as newer_templates')
                ->whereColumn('newer_templates.category', 'inspection_templates.category')
                ->whereColumn('newer_templates.version', '>', 'inspection_templates.version'))
            ->orderBy('category')
            ->get();

        return ApiResponse::ok(InspectionTemplateResource::collection($templates)->resolve());
    }

    public function store(StoreInspectionTemplateRequest $request): JsonResponse
    {
        Gate::authorize('create', InspectionTemplate::class);
        $data = $request->validated();

        [$template, $created] = DB::transaction(function () use ($data, $request): array {
            $template = InspectionTemplate::query()
                ->where('category', $data['category'])
                ->orderByDesc('version')
                ->lockForUpdate()
                ->first();

            $created = $template === null;
            if ($created) {
                $version = (int) InspectionTemplate::query()
                    ->where('category', $data['category'])
                    ->max('version') + 1;

                $template = InspectionTemplate::query()->create([
                    'category' => $data['category'],
                    'version' => $version,
                    'created_by' => $request->user()->id,
                    'created_at' => now(),
                ]);
            }

            $existingItems = $template->items()->orderBy('sort_order')->get();

            foreach ($data['items'] as $sortOrder => $item) {
                $values = [
                    'inspection_item' => $item['inspection_item'],
                    'standard' => $item['standard'] ?? '',
                    'input_template' => $item['input_template'] ?? '',
                    'input_fields' => [],
                    'sort_order' => $sortOrder,
                ];

                $existingItem = $existingItems->get($sortOrder);
                if ($existingItem) {
                    $existingItem->update($values);
                } else {
                    $template->items()->create($values);
                }
            }

            $existingItems->slice(count($data['items']))->each->delete();

            return [$template->load('items'), $created];
        });

        return ApiResponse::ok((new InspectionTemplateResource($template))->resolve(), $created ? 201 : 200);
    }
}