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
            $table->string('username', 5)->nullable()->after('id');
        });

        $used = [];
        $users = DB::table('users')->select(['id', 'email'])->orderBy('id')->get();
        foreach ($users as $user) {
            $email = mb_strtolower(trim((string) $user->email));
            $letters = preg_replace('/[^a-z]/', '', strtolower(strstr($email, '@', true) ?: '')) ?? '';
            if ($email === 'wkkim97@gmail.com') {
                $username = 'admin';
            } else {
                $username = substr($letters, 0, 5);
            }

            if ($email !== 'wkkim97@gmail.com' && (strlen($username) !== 5 || $username === 'admin' || isset($used[$username]))) {
                $prefix = substr($letters, 0, 2);
                $username = null;
                for ($attempt = 0; $attempt < 1000; $attempt++) {
                    $hash = hash('sha256', $user->id.':'.$attempt);
                    $suffix = '';
                    foreach (str_split($hash) as $character) {
                        $suffix .= chr(ord('a') + (hexdec($character) % 26));
                    }
                    $candidate = str_pad($prefix, 2, 'x').substr($suffix, 0, 3);
                    if ($candidate !== 'admin' && ! isset($used[$candidate])) {
                        $username = $candidate;
                        break;
                    }
                }
                if ($username === null) {
                    throw new \RuntimeException('Unable to generate a unique five-letter username.');
                }
            }

            $used[$username] = true;
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 5)->nullable(false)->change();
            $table->string('email')->nullable()->change();
            $table->unique('username');
        });
    }

    public function down(): void
    {
        throw new \RuntimeException('Username and role migration cannot be safely reversed; restore from a reviewed backup.');
    }
};
