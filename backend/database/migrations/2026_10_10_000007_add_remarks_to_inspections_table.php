<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspections', function (Blueprint $table): void {
            $table->text('remarks')->nullable()->after('emailed_at');
            $table->index(['inspected_on', 'created_at'], 'inspections_inspected_on_idx');
        });
    }

    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table): void {
            $table->dropIndex('inspections_inspected_on_idx');
            $table->dropColumn('remarks');
        });
    }
};
