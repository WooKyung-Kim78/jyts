<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadEquipmentPhotoRequest;
use App\Http\Resources\EquipmentPhotoResource;
use App\Models\Equipment;
use App\Models\EquipmentPhoto;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class EquipmentPhotoController extends Controller
{
    public function store(UploadEquipmentPhotoRequest $request, Equipment $equipment): JsonResponse
    {
        Gate::authorize('update', $equipment);

        $image = $request->file('image');
        $extension = match ($image->getMimeType()) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Unsupported equipment photo MIME type.'),
        };
        $path = "equipment/{$equipment->id}/photos/".Str::uuid().".{$extension}";
        if (! Storage::disk('local')->putFileAs(dirname($path), $image, basename($path))) {
            return ApiResponse::fail(500);
        }

        try {
            $photo = $equipment->photos()->create([
                'storage_path' => $path,
                'mime_type' => $image->getMimeType(),
                'size_bytes' => $image->getSize(),
                'created_by' => $request->user()->id,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return ApiResponse::ok((new EquipmentPhotoResource($photo))->resolve(), 201);
    }

    public function show(EquipmentPhoto $equipmentPhoto)
    {
        $equipment = $equipmentPhoto->equipment;
        abort_unless($equipment !== null, 404);
        Gate::authorize('view', $equipment);

        $prefix = "equipment/{$equipment->id}/photos/";
        abort_unless(str_starts_with($equipmentPhoto->storage_path, $prefix), 404);
        abort_unless(Storage::disk('local')->exists($equipmentPhoto->storage_path), 404);

        return Storage::disk('local')->response($equipmentPhoto->storage_path, null, ['Cache-Control' => 'private, no-store'], 'inline');
    }

    public function destroy(EquipmentPhoto $equipmentPhoto): JsonResponse
    {
        $equipment = $equipmentPhoto->equipment;
        abort_unless($equipment !== null, 404);
        Gate::authorize('update', $equipment);

        $prefix = "equipment/{$equipment->id}/photos/";
        abort_unless(str_starts_with($equipmentPhoto->storage_path, $prefix), 404);
        Storage::disk('local')->delete($equipmentPhoto->storage_path);
        $equipmentPhoto->delete();

        return ApiResponse::ok(['deleted' => true]);
    }
}