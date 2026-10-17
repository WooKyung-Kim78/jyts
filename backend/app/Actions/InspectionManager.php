<?php

namespace App\Actions;

use App\Mail\InspectionReportMail;
use App\Models\Equipment;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionTemplate;
use App\Models\User;
use App\Support\InspectionInputTemplate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Throwable;

class InspectionManager
{
    // Gmail rejects messages over 25MB; base64 encoding adds about a third.
    public const MAX_EMAIL_ATTACHMENT_BYTES = 18 * 1024 * 1024;
    /** @return array{0: Inspection, 1: bool} */
    public function start(Equipment $equipment, User $actor): array
    {
        return DB::transaction(function () use ($equipment, $actor): array {
            $existing = Inspection::query()
                ->where('equipment_id', $equipment->id)
                ->where('created_by', $actor->id)
                ->where('status', 'DRAFT')
                ->latest('created_at')
                ->first();
            if ($existing) {
                return [$existing, false];
            }

            $template = InspectionTemplate::query()
                ->with('items')
                ->where('category', $equipment->category)
                ->orderByDesc('version')
                ->first();
            if (! $template || $template->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'equipment_id' => '이 장비 종류의 점검일지 마스터가 없습니다. 관리자에게 등록을 요청하세요.',
                ]);
            }

            $inspection = new Inspection([
                'equipment_id' => $equipment->id,
                'inspection_template_id' => $template->id,
                'template_version' => $template->version,
                'category' => $equipment->category,
                'inspected_on' => now('Asia/Seoul')->toDateString(),
            ]);
            $inspection->forceFill(['status' => 'DRAFT', 'created_by' => $actor->id, 'updated_by' => $actor->id])->save();

            foreach ($template->items->values() as $index => $templateItem) {
                $inspection->items()->create([
                    'template_item_id' => $templateItem->id,
                    'sort_order' => $index,
                    'inspection_item' => $templateItem->inspection_item,
                    'standard' => (string) $templateItem->standard,
                    'input_template' => (string) $templateItem->input_template,
                    'input_values' => array_fill(0, count(InspectionInputTemplate::fieldTypes($templateItem->input_template)), ''),
                ]);
            }

            return [$inspection, true];
        });
    }

    /** @param array{input_values: array<int, string|null>, result?: string|null, remarks?: string|null} $data */
    public function saveItem(InspectionItem $item, array $data, User $actor): InspectionItem
    {
        return DB::transaction(function () use ($item, $data, $actor): InspectionItem {
            $remarks = trim((string) ($data['remarks'] ?? ''));
            $item->fill([
                'input_values' => array_map(fn (?string $value): string => trim((string) $value), array_values($data['input_values'])),
                'result' => $data['result'] ?? null,
                'remarks' => $remarks === '' ? null : $remarks,
            ]);
            $item->forceFill(['saved_at' => now(), 'updated_by' => $actor->id])->save();
            $item->inspection->forceFill(['updated_by' => $actor->id, 'updated_at' => now()])->save();

            return $item->load('photos');
        });
    }

    /** @param array{remarks?: string|null, inspected_on?: string} $data */
    public function update(Inspection $inspection, array $data, User $actor): Inspection
    {
        if (array_key_exists('remarks', $data)) {
            $remarks = trim((string) $data['remarks']);
            $inspection->fill(['remarks' => $remarks === '' ? null : $remarks]);
        }
        if (array_key_exists('inspected_on', $data)) {
            $inspection->fill(['inspected_on' => $data['inspected_on']]);
        }
        $inspection->forceFill(['updated_by' => $actor->id])->save();

        return $inspection;
    }

    public function delete(Inspection $inspection, User $actor): void
    {
        DB::transaction(function () use ($inspection, $actor): void {
            $inspection->forceFill(['deleted_by' => $actor->id])->save();
            $inspection->delete();
        });
    }

    public function complete(Inspection $inspection, User $actor): Inspection
    {
        return DB::transaction(function () use ($inspection, $actor): Inspection {
            $missing = $inspection->items()->whereNull('result')->count();
            if ($missing > 0) {
                throw ValidationException::withMessages([
                    'items' => "결과를 선택하지 않은 항목이 {$missing}개 있습니다.",
                ]);
            }

            if ($inspection->status === 'DRAFT') {
                $inspection->forceFill(['status' => 'COMPLETED', 'completed_at' => now()]);
            }
            $inspection->forceFill(['updated_by' => $actor->id])->save();

            return $inspection;
        });
    }

    public function sendReportEmail(Inspection $inspection, string $to, User $actor): Inspection
    {
        $inspection->load(['equipment.organization', 'creator', 'items.photos']);
        if (InspectionReportMail::attachmentBytes($inspection) > self::MAX_EMAIL_ATTACHMENT_BYTES) {
            throw ValidationException::withMessages([
                'to' => '점검 사진 용량이 18MB를 넘어 메일로 보낼 수 없습니다. 사진 일부를 삭제한 뒤 다시 시도하세요.',
            ]);
        }

        $previous = [
            'emailed_at' => $inspection->getRawOriginal('emailed_at'),
            'emailed_to' => $inspection->getRawOriginal('emailed_to'),
            'emailed_by' => $inspection->getRawOriginal('emailed_by'),
        ];

        // Lock the report before sending so it cannot be edited while the mail is in flight.
        $sentAt = now();
        $claimed = Inspection::query()
            ->whereKey($inspection->id)
            ->where('status', 'COMPLETED')
            ->update(['emailed_at' => $sentAt, 'emailed_to' => $to, 'emailed_by' => $actor->id, 'updated_by' => $actor->id]);
        if ($claimed === 0) {
            throw new ConflictHttpException;
        }

        try {
            Mail::to($to)->send(new InspectionReportMail($inspection));
        } catch (Throwable $exception) {
            Inspection::query()->whereKey($inspection->id)->update($previous);
            throw $exception;
        }

        $inspection->emailLogs()->create(['sent_to' => $to, 'sent_by' => $actor->id, 'sent_at' => $sentAt]);

        return $inspection->refresh();
    }
}
