<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $categories = ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'];

        foreach ($categories as $category) {
            $templates = DB::table('inspection_templates')
                ->where('category', $category)
                ->orderBy('version')
                ->get();

            if ($templates->count() < 2 || $templates->contains(fn ($template) => $template->created_by === null)) {
                continue;
            }

            $mergedTemplateId = (string) Str::uuid();
            $mergedVersion = (int) $templates->max('version') + 1;

            DB::table('inspection_templates')->insert([
                'id' => $mergedTemplateId,
                'category' => $category,
                'version' => $mergedVersion,
                'created_by' => null,
                'created_at' => now(),
            ]);

            $items = DB::table('inspection_template_items')
                ->whereIn('inspection_template_id', $templates->pluck('id'))
                ->orderBy('inspection_template_id')
                ->get();

            $versionOrder = $templates->pluck('version', 'id');
            $items = $items->sort(function ($left, $right) use ($versionOrder): int {
                $versionComparison = $versionOrder[$left->inspection_template_id] <=> $versionOrder[$right->inspection_template_id];
                if ($versionComparison !== 0) {
                    return $versionComparison;
                }

                $sortComparison = $left->sort_order <=> $right->sort_order;
                return $sortComparison !== 0 ? $sortComparison : strcmp($left->id, $right->id);
            })->values();

            foreach ($items as $sortOrder => $item) {
                DB::table('inspection_template_items')->insert([
                    'id' => (string) Str::uuid(),
                    'inspection_template_id' => $mergedTemplateId,
                    'inspection_item' => $item->inspection_item,
                    'standard' => $item->standard,
                    'input_template' => $item->input_template,
                    'input_fields' => $item->input_fields,
                    'sort_order' => $sortOrder,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Keep the copied current lists and original templates intact on rollback.
    }
};