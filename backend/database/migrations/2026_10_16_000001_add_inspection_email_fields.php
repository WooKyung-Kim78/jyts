<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table): void {
            $table->string('contact_email', 254)->nullable()->after('contact_phone');
        });

        Schema::table('inspections', function (Blueprint $table): void {
            $table->string('emailed_to', 254)->nullable()->after('emailed_at');
            $table->foreignId('emailed_by')->nullable()->after('emailed_to')->constrained('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('emailed_by');
            $table->dropColumn('emailed_to');
        });

        Schema::table('organizations', function (Blueprint $table): void {
            $table->dropColumn('contact_email');
        });
    }
};
