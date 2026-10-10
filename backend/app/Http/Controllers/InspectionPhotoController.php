<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadInspectionPhotoRequest;
use App\Http\Resources\InspectionItemPhotoResource;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionItemPhoto;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class InspectionPhotoController extends Controller
{
    private const MAX_PHOTOS_PER_ITEM = 10;

    public function store(UploadInspectionPhotoRequest $request, Inspection $inspection, InspectionItem $item): JsonResponse
    {
        Gate::authorize('update', $inspection);
        if ($item->photos()->count() >= self::MAX_PHOTOS_PER_ITEM) {
            throw ValidationException::withMessages(['image' => '항목당 사진은 최대 '.self::MAX_PHOTOS_PER_ITEM.'장까지 첨부할 수 있습니다.']);
        }

        $image = $request->file('image');
        $extension = match ($image->getMimeType()) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Unsupported inspection photo MIME type.'),
        };
        $path = "inspections/{$inspection->id}/".Str::uuid().".{$extension}";
        if (! Storage::disk('local')->putFileAs(dirname($path), $image, basename($path))) {
            return ApiResponse::fail(500);
        }

        try {
            $photo = $item->photos()->create([
                'storage_path' => $path,
                'mime_type' => $image->getMimeType(),
                'size_bytes' => $image->getSize(),
                'created_by' => $request->user()->id,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return ApiResponse::ok((new InspectionItemPhotoResource($photo))->resolve(), 201);
    }

    public function show(InspectionItemPhoto $photo)
    {
        $inspection = $this->inspectionFor($photo);
        Gate::authorize('view', $inspection);
        abort_unless(Storage::disk('local')->exists($photo->storage_path), 404);

        return Storage::disk('local')->response($photo->storage_path, null, ['Cache-Control' => 'private, no-store'], 'inline');
    }

    public function destroy(InspectionItemPhoto $photo): JsonResponse
    {
        $inspection = $this->inspectionFor($photo);
        Gate::authorize('update', $inspection);

        Storage::disk('local')->delete($photo->storage_path);
        $photo->delete();

        return ApiResponse::ok(['deleted' => true]);
    }

    private function inspectionFor(InspectionItemPhoto $photo): Inspection
    {
        $inspection = $photo->item?->inspection;
        abort_unless($inspection !== null, 404);
        abort_unless(str_starts_with($photo->storage_path, "inspections/{$inspection->id}/"), 404);

        return $inspection;
    }
}
