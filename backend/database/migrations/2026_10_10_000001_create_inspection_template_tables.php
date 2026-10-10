<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inspection_templates')) {
            Schema::create('inspection_templates', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->enum('category', ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM']);
                $table->unsignedInteger('version');
                $table->foreignId('created_by')->nullable()->constrained('users')->restrictOnDelete();
                $table->dateTime('created_at')->nullable();
                $table->unique(['category', 'version']);
            });
        }

        if (! Schema::hasTable('inspection_template_items')) {
            Schema::create('inspection_template_items', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('inspection_template_id')->constrained()->restrictOnDelete();
                $table->string('inspection_item', 255);
                $table->text('standard');
                $table->json('input_fields');
                $table->unsignedInteger('sort_order')->default(0);
            });
        }

        if (! Schema::hasIndex('inspection_template_items', 'inspection_template_items_template_sort_idx')) {
            Schema::table('inspection_template_items', function (Blueprint $table): void {
                $table->index(['inspection_template_id', 'sort_order'], 'inspection_template_items_template_sort_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_template_items');
        Schema::dropIfExists('inspection_templates');
    }
};