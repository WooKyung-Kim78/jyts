<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Nullable so existing equipment stays valid until a cycle is chosen in the UI.
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->string('inspection_cycle', 20)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropColumn('inspection_cycle');
        });
    }
};
