<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UploadOrganizationMapRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class OrganizationController extends Controller
{
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Organization::class);

        return ApiResponse::ok(OrganizationResource::collection(
            Organization::query()->orderBy('name')->get()
        )->resolve());
    }

    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        Gate::authorize('create', Organization::class);

        $organization = Organization::query()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        return ApiResponse::ok((new OrganizationResource($organization))->resolve(), 201);
    }

    public function update(StoreOrganizationRequest $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        $organization->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        return ApiResponse::ok((new OrganizationResource($organization))->resolve());
    }

    public function uploadMap(UploadOrganizationMapRequest $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        $newPath = $request->file('image')->store("organizations/{$organization->id}/map", 'local');
        if (! is_string($newPath)) {
            return ApiResponse::fail(500);
        }

        $oldPath = $organization->map_image_path;

        try {
            $organization->forceFill([
                'map_image_path' => $newPath,
                'updated_by' => $request->user()->id,
            ])->save();
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($newPath);
            throw $exception;
        }

        if ($oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        return ApiResponse::ok(['map_image_url' => "/api/organizations/{$organization->id}/map"]);
    }

    public function showMap(Organization $organization)
    {
        Gate::authorize('view', $organization);

        $path = $organization->map_image_path;
        $expectedPrefix = "organizations/{$organization->id}/map/";
        abort_unless(is_string($path) && str_starts_with($path, $expectedPrefix), 404);
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, ['Cache-Control' => 'private, no-store'], 'inline');
    }

    public function deleteMap(Request $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        if ($organization->map_image_path) {
            Storage::disk('local')->delete($organization->map_image_path);
            $organization->forceFill([
                'map_image_path' => null,
                'updated_by' => $request->user()->id,
            ])->save();
        }

        return ApiResponse::ok(['map_image_url' => null]);
    }

    public function destroy(Organization $organization): JsonResponse
    {
        Gate::authorize('delete', $organization);

        if ($organization->sites()->withTrashed()->exists()) {
            throw ValidationException::withMessages([
                'organization' => '기존 사업장 이력이 연결되어 있어 고객사를 삭제할 수 없습니다.',
            ]);
        }

        if ($organization->map_image_path) {
            Storage::disk('local')->delete($organization->map_image_path);
        }

        $organization->delete();

        return ApiResponse::ok(['deleted' => true]);
    }
}