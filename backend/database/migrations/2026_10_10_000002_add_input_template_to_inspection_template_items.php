<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspection_template_items', function (Blueprint $table): void {
            $table->text('input_template')->nullable()->after('standard');
        });
    }

    public function down(): void
    {
        Schema::table('inspection_template_items', function (Blueprint $table): void {
            $table->dropColumn('input_template');
        });
    }
};