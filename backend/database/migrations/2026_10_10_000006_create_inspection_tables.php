<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('equipment_id')->constrained('equipment')->restrictOnDelete();
            $table->foreignUuid('inspection_template_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('template_version');
            $table->enum('category', ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM']);
            $table->enum('status', ['DRAFT', 'COMPLETED', 'CANCELLED'])->default('DRAFT');
            $table->date('inspected_on');
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('emailed_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->index(['equipment_id', 'status', 'created_at'], 'inspections_equipment_status_idx');
        });

        Schema::create('inspection_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_id')->constrained()->restrictOnDelete();
            // Master items can be removed later, so the snapshot keeps the id without a foreign key.
            $table->uuid('template_item_id')->nullable();
            $table->unsignedInteger('sort_order');
            $table->string('inspection_item', 255);
            $table->text('standard');
            $table->text('input_template');
            $table->json('input_values');
            $table->enum('result', ['GOOD', 'BAD'])->nullable();
            $table->text('remarks')->nullable();
            $table->dateTime('saved_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->index(['inspection_id', 'sort_order'], 'inspection_items_inspection_sort_idx');
            $table->index('template_item_id', 'inspection_items_template_item_idx');
        });

        Schema::create('inspection_item_photos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_item_id')->constrained()->restrictOnDelete();
            $table->string('storage_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->foreignId('created_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->index(['inspection_item_id', 'created_at'], 'inspection_item_photos_item_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_item_photos');
        Schema::dropIfExists('inspection_items');
        Schema::dropIfExists('inspections');
    }
};
