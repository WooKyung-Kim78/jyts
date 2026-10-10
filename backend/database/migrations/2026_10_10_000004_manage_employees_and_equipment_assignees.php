<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('auth_version')->default(0);
            $table->enum('role', ['ADMIN', 'TECHNICIAN', 'VIEWER', 'USER'])->default('USER')->change();
        });

        DB::table('users')->whereIn('role', ['TECHNICIAN', 'VIEWER'])->update(['role' => 'USER']);

        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['ADMIN', 'USER'])->default('USER')->change();
        });

        Schema::table('equipment', function (Blueprint $table): void {
            $table->foreignId('assigned_user_id')->nullable()->after('updated_by')
                ->constrained('users')->restrictOnDelete();
            $table->index('assigned_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropIndex(['assigned_user_id']);
            $table->dropConstrainedForeignId('assigned_user_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['ADMIN', 'TECHNICIAN', 'VIEWER', 'USER'])->default('USER')->change();
        });

        DB::table('users')->where('role', 'USER')->update(['role' => 'VIEWER']);

        Schema::table('users', function (Blueprint $table): void {
            $table->enum('role', ['ADMIN', 'TECHNICIAN', 'VIEWER'])->default('VIEWER')->change();
            $table->dropColumn('auth_version');
        });
    }
};