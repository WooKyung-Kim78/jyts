<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_email_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_id')->constrained()->restrictOnDelete();
            $table->string('sent_to', 254);
            $table->foreignId('sent_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('sent_at');
            $table->index(['inspection_id', 'sent_at'], 'inspection_email_logs_inspection_sent_idx');
        });

        // Keep the last send already recorded on inspections as the first history row.
        DB::table('inspections')
            ->whereNotNull('emailed_at')
            ->whereNotNull('emailed_to')
            ->whereNotNull('emailed_by')
            ->orderBy('id')
            ->get(['id', 'emailed_at', 'emailed_to', 'emailed_by'])
            ->each(fn (object $row) => DB::table('inspection_email_logs')->insert([
                'id' => (string) Str::uuid(),
                'inspection_id' => $row->id,
                'sent_to' => $row->emailed_to,
                'sent_by' => $row->emailed_by,
                'sent_at' => $row->emailed_at,
            ]));
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_email_logs');
    }
};
