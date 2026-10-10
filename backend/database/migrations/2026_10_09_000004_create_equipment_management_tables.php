<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_master_fields', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->enum('category', ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM']);
            $table->string('label', 120);
            $table->enum('field_type', ['text', 'textarea', 'number', 'date', 'select', 'checkbox']);
            $table->json('options')->nullable();
            $table->boolean('required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->index(['category', 'active', 'sort_order']);
        });

        Schema::create('equipment', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('copied_from_id')->nullable()->constrained('equipment')->restrictOnDelete();
            $table->string('equipment_code', 60);
            $table->string('name', 150);
            $table->enum('category', ['PRECISION_AIR_CONDITIONER', 'UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM']);
            $table->enum('status', ['ACTIVE', 'INSPECTION_REQUIRED', 'OUT_OF_SERVICE', 'DISPOSED'])->default('ACTIVE');
            $table->foreignId('created_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->string('active_equipment_code', 60)->nullable()
                ->storedAs('CASE WHEN deleted_at IS NULL THEN equipment_code ELSE NULL END');
            $table->unique('active_equipment_code');
            $table->index(['organization_id', 'category', 'deleted_at']);
        });

        Schema::create('equipment_attributes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('equipment_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('master_field_id')->nullable()->constrained('equipment_master_fields')->nullOnDelete();
            $table->string('label', 120);
            $table->enum('field_type', ['text', 'textarea', 'number', 'date', 'select', 'checkbox']);
            $table->json('options')->nullable();
            $table->text('value')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->dateTime('created_at')->nullable();
            $table->dateTime('updated_at')->nullable();
            $table->index(['equipment_id', 'sort_order']);
        });

        Schema::create('equipment_photos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('equipment_id')->constrained()->restrictOnDelete();
            $table->string('storage_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->foreignId('created_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('created_at')->nullable();
            $table->index(['equipment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_photos');
        Schema::dropIfExists('equipment_attributes');
        Schema::dropIfExists('equipment');
        Schema::dropIfExists('equipment_master_fields');
    }
};