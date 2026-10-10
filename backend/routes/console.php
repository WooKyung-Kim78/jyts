<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\EquipmentMasterField;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:create-admin {username} {name} {--email=}', function (string $username, string $name): int {
    $username = strtolower(trim($username));
    $email = $this->option('email');
    $email = is_string($email) && trim($email) !== '' ? mb_strtolower(trim($email)) : null;
    $name = trim($name);

    $validator = Validator::make(
        ['username' => $username, 'email' => $email, 'name' => $name],
        [
            'username' => ['required', 'regex:/\A[a-z]{5}\z/', 'unique:users,username'],
            'email' => ['nullable', 'email', 'max:254', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
        ],
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $message) {
            $this->error($message);
        }

        return self::FAILURE;
    }

    $password = $this->secret('새 관리자 비밀번호 (영문+숫자+특수문자, 8자 이상):');
    $confirmation = $this->secret('비밀번호 확인:');

    $validPassword = is_string($password)
        && preg_match('/\A[!-~]{8,128}\z/', $password) === 1
        && preg_match('/[A-Za-z]/', $password) === 1
        && preg_match('/[0-9]/', $password) === 1
        && preg_match('/[^A-Za-z0-9]/', $password) === 1;

    if (! $validPassword) {
        $this->error('비밀번호는 영문자, 숫자, 특수문자를 모두 포함해 8자 이상 128자 이하로 입력해야 합니다.');

        return self::FAILURE;
    }

    if (! is_string($confirmation) || ! hash_equals($password, $confirmation)) {
        $this->error('비밀번호가 일치하지 않습니다.');

        return self::FAILURE;
    }

    $user = DB::transaction(function () use ($username, $email, $name, $password): User {
        $user = User::query()->create([
            'username' => $username,
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ]);

        $user->forceFill(['role' => 'ADMIN', 'active' => true])->save();

        return $user;
    });

    $this->info("ADMIN 계정을 생성했습니다: {$user->username}");

    return self::SUCCESS;
})->purpose('Create the initial administrator account (username must be five letters)');

Artisan::command('app:seed-standard-equipment-master', function (): int {
    $adminId = User::query()->where('role', 'ADMIN')->where('active', true)->value('id');
    if (! $adminId) {
        $this->error('활성 ADMIN 계정이 없어 장비 마스터를 등록할 수 없습니다.');

        return self::FAILURE;
    }

    $definitions = [
        'PRECISION_AIR_CONDITIONER' => [
            ['냉방 용량 (RT)', 'text'],
            ['컴프레서 수량', 'text'],
            ['송풍 방식', 'text'],
            ['사용 전압', 'text'],
            ['냉매', 'text'],
            ['풍량', 'text'],
            ['실내기 모델', 'text'],
            ['실외기 모델', 'text'],
            ['설치 위치', 'text'],
            ['가습기', 'text'],
            ['재열기', 'text'],
            ['온습도 센서', 'text'],
            ['컨트롤러', 'text'],
            ['압축기', 'text'],
            ['송풍기 모터', 'text'],
            ['실외기 팬 모터', 'text'],
            ['필터', 'text'],
            ['차단기', 'text'],
            ['마그네트', 'text'],
            ['EOCR', 'text'],
            ['드라이어', 'text'],
            ['팽창변', 'text'],
            ['압력 스위치', 'text'],
            ['배수 펌프', 'text'],
        ],
        'UPS' => [
            ['정격 용량 (kVA)', 'text'],
            ['입력 전압', 'text'],
            ['출력 전압', 'text'],
            ['주파수', 'text'],
            ['제조년월', 'text'],
            ['배터리 모델', 'text'],
            ['배터리 수량', 'text'],
            ['배터리 제조일', 'text'],
            ['배터리 전압', 'text'],
            ['배터리 교체 예정일', 'text'],
            ['차단기', 'text'],
        ],
        'FIRE_SUPPRESSION' => [
            ['종별', 'text'],
            ['형식', 'text'],
            ['형식승인번호', 'text'],
            ['제조년월', 'text'],
            ['제조번호', 'text'],
            ['약제 종류', 'text'],
            ['약제 용량', 'text'],
            ['예비전원', 'text'],
            ['퓨즈 용량', 'text'],
        ],
        'VOICE_ALARM' => [
            ['제조사', 'text'],
            ['모델명', 'text'],
            ['제조번호', 'text'],
            ['경보 연동 여부', 'text'],
            ['연동 대상', 'text'],
            ['설치 위치', 'text'],
            ['통신 방식', 'text'],
            ['전원 사양', 'text'],
        ],
    ];

    $created = 0;
    $skipped = 0;

    DB::transaction(function () use ($definitions, $adminId, &$created, &$skipped): void {
        foreach ($definitions as $category => $fields) {
            foreach ($fields as $sortOrder => [$label, $fieldType]) {
                $exists = EquipmentMasterField::withTrashed()
                    ->where('category', $category)
                    ->where('label', $label)
                    ->exists();

                if ($exists) {
                    $skipped++;
                    continue;
                }

                EquipmentMasterField::query()->create([
                    'category' => $category,
                    'label' => $label,
                    'field_type' => $fieldType,
                    'options' => null,
                    'required' => false,
                    'sort_order' => $sortOrder,
                    'active' => true,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]);
                $created++;
            }
        }
    });

    $this->info("장비 마스터 항목 저장 완료: {$created}개 생성, {$skipped}개 기존 항목 건너뜀");

    return self::SUCCESS;
})->purpose('Seed the documented baseline equipment fields without overwriting existing master data');

Artisan::command('app:replace-precision-air-master', function (): int {
    $adminId = User::query()->where('role', 'ADMIN')->where('active', true)->value('id');
    if (! $adminId) {
        $this->error('활성 ADMIN 계정이 없어 장비 마스터를 교체할 수 없습니다.');

        return self::FAILURE;
    }

    $labels = [
        '제조사',
        '제조년월',
        '모델명실내기',
        '모델명실외기',
        '사용전압',
        '냉매',
        '장비위치-실내기',
        '장비위치-실외기',
        '마이콤-제조사',
        '마이콤-모델명',
        '콘트롤러-제조사',
        '콘트롤러-모델명',
        '송풍기모터',
        'Compressor',
        '실외기-팬모터',
        '실외기-팬날개',
        '송풍방식',
        '가습기-모델명',
        '가습기-형식',
        'Reheater',
        '온습도센서',
        '풍량',
        '압력스위치',
        '드라이어',
        '팽창변-제조사',
        '팽창변-모델명',
        '배수펌프',
        '필터사이즈',
        'SolenoidV/V',
        '차단기-Main',
        '차단기-Blower',
        '차단기-Comp',
        '차단기-Heater',
        '차단기-Humi',
        '마그네트-Blower',
        '마그네트-Comp',
        '마그네트-Fan',
        '마그네트-Heater',
        '마그네트-Humi',
        'EOCR-Blower',
        'EOCR-Comp',
        'EOCR-Fan',
    ];

    $activeFields = EquipmentMasterField::query()
        ->where('category', 'PRECISION_AIR_CONDITIONER')
        ->orderBy('sort_order')
        ->get();
    if ($activeFields->pluck('label')->all() === $labels
        && $activeFields->every(fn (EquipmentMasterField $field): bool => $field->field_type === 'text')) {
        $this->info('항온항습기 마스터가 이미 요청한 항목으로 설정되어 있습니다.');

        return self::SUCCESS;
    }

    DB::transaction(function () use ($activeFields, $labels, $adminId): void {
        foreach ($activeFields as $field) {
            $field->forceFill(['updated_by' => $adminId])->delete();
        }

        foreach ($labels as $sortOrder => $label) {
            EquipmentMasterField::query()->create([
                'category' => 'PRECISION_AIR_CONDITIONER',
                'label' => $label,
                'field_type' => 'text',
                'options' => null,
                'required' => false,
                'sort_order' => $sortOrder,
                'active' => true,
                'created_by' => $adminId,
                'updated_by' => $adminId,
            ]);
        }
    });

    $this->info('항온항습기 마스터를 42개 짧은 문장 항목으로 교체했습니다.');

    return self::SUCCESS;
})->purpose('Replace precision air conditioner master fields with the approved short-text list');
