<?php

namespace App\Mail;

use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionItemPhoto;
use App\Support\InspectionInputTemplate;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;

class InspectionReportMail extends Mailable
{
    public const CATEGORY_LABELS = [
        'PRECISION_AIR_CONDITIONER' => '항온항습기',
        'UPS' => 'UPS',
        'FIRE_SUPPRESSION' => '소방장비',
        'VOICE_ALARM' => '음성통보기',
    ];

    private const PHOTO_EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    /** Expects equipment.organization, creator and items.photos to be loaded. */
    public function __construct(public readonly Inspection $inspection)
    {
    }

    public function envelope(): Envelope
    {
        $equipment = $this->inspection->equipment;

        return new Envelope(subject: sprintf(
            '[JYTS] %s %s 정기점검 결과 (%s)',
            $equipment?->organization?->name ?? '',
            $equipment?->name ?? '',
            $this->inspection->inspected_on?->toDateString() ?? '',
        ));
    }

    public function content(): Content
    {
        $category = $this->inspection->category;
        $isFire = $category === 'FIRE_SUPPRESSION';

        return new Content(view: 'emails.inspection-report', with: [
            'inspection' => $this->inspection,
            'categoryLabel' => self::CATEGORY_LABELS[$category] ?? $category,
            'labels' => [
                'item' => $isFire ? '점검항목' : '점검사항',
                'standard' => $isFire ? '점검사항' : ($category === 'UPS' ? null : '기준치'),
                'content' => $isFire ? null : ($category === 'UPS' ? '점검' : '점검 내용'),
                'result' => $isFire ? '점검결과' : '결과',
                'remarks' => $isFire ? '기타사항' : '메모',
            ],
            'rows' => $this->inspection->items->values()->map(fn (InspectionItem $item, int $index): array => [
                'no' => $index + 1,
                'item' => $item->inspection_item,
                'standard' => $item->standard,
                'content' => $item->input_template ? InspectionInputTemplate::fill($item->input_template, $item->input_values ?? []) : '',
                'result' => ['GOOD' => '양호', 'BAD' => '불량'][$item->result] ?? '-',
                'is_bad' => $item->result === 'BAD',
                'remarks' => $item->remarks,
                'photo_count' => count(self::storedPhotos($this->inspection, $item)),
            ])->all(),
        ]);
    }

    /** @return list<Attachment> */
    public function attachments(): array
    {
        $attachments = [];
        foreach ($this->inspection->items->values() as $index => $item) {
            foreach (self::storedPhotos($this->inspection, $item) as $photoIndex => $photo) {
                $extension = self::PHOTO_EXTENSIONS[$photo->mime_type] ?? 'jpg';
                $attachments[] = Attachment::fromStorageDisk('local', $photo->storage_path)
                    ->as(sprintf('item-%02d-photo-%d.%s', $index + 1, $photoIndex + 1, $extension))
                    ->withMime($photo->mime_type);
            }
        }

        return $attachments;
    }

    public static function attachmentBytes(Inspection $inspection): int
    {
        return (int) $inspection->items->sum(fn (InspectionItem $item): int => array_sum(array_map(
            fn (InspectionItemPhoto $photo): int => $photo->size_bytes,
            self::storedPhotos($inspection, $item),
        )));
    }

    /** @return list<InspectionItemPhoto> */
    private static function storedPhotos(Inspection $inspection, InspectionItem $item): array
    {
        // Only files inside this inspection's private folder are attached.
        $prefix = "inspections/{$inspection->id}/";

        return $item->photos
            ->filter(fn (InspectionItemPhoto $photo): bool => str_starts_with($photo->storage_path, $prefix)
                && ! str_contains($photo->storage_path, '..')
                && Storage::disk('local')->exists($photo->storage_path))
            ->values()
            ->all();
    }
}
