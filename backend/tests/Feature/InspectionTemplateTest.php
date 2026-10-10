<?php

namespace Tests\Feature;

use App\Models\InspectionTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class InspectionTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_admin_can_manage_a_single_ordered_hvac_checklist(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web');
        $payload = [
            'category' => 'PRECISION_AIR_CONDITIONER',
            'items' => [
                [
                    'inspection_item' => '압축기 운전 중 전류 측정',
                    'standard' => '정상 운전 전류 기준 확인',
                    'input_template' => "1. {text} ~ {text} A\n2. 저압:{text} ~ {text} Kg/㎠",
                ],
                [
                    'inspection_item' => '냉매 압력 확인',
                    'standard' => '기준 범위 확인',
                    'input_template' => '고압:{text} Kg/㎠',
                ],
            ],
        ];

        $first = $this->postJson('/api/inspection-templates', $payload)
            ->assertCreated()
            ->assertJsonPath('data.items.0.inspection_item', '압축기 운전 중 전류 측정')
            ->assertJsonPath('data.items.0.input_template', "1. {text} ~ {text} A\n2. 저압:{text} ~ {text} Kg/㎠")
            ->json('data');

        $payload['items'] = [
            [
                'inspection_item' => '냉매 압력 확인',
                'standard' => '수정된 압력 기준',
                'input_template' => '고압:{text} ~ {text} Kg/㎠',
            ],
            [
                'inspection_item' => '압축기 운전 중 전류 측정',
                'standard' => '정상 운전 전류 기준 확인',
                'input_template' => "1. {text} ~ {text} A\n2. 저압:{text} ~ {text} Kg/㎠",
            ],
        ];
        $this->postJson('/api/inspection-templates', $payload)
            ->assertOk()
            ->assertJsonPath('data.id', $first['id'])
            ->assertJsonPath('data.items.0.inspection_item', '냉매 압력 확인')
            ->assertJsonPath('data.items.0.standard', '수정된 압력 기준')
            ->assertJsonMissingPath('data.version');

        $this->assertDatabaseCount('inspection_templates', 1);
        $this->assertDatabaseCount('inspection_template_items', 2);
        $this->getJson('/api/inspection-templates?category=PRECISION_AIR_CONDITIONER')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.items.0.inspection_item', '냉매 압력 확인')
            ->assertJsonPath('data.0.items.0.sort_order', 0)
            ->assertJsonPath('data.0.items.1.inspection_item', '압축기 운전 중 전류 측정')
            ->assertJsonPath('data.0.items.1.sort_order', 1);
    }

    public function test_legacy_template_versions_are_copied_into_one_current_ordered_list(): void
    {
        $user = $this->createUser('ADMIN');
        $olderTemplate = InspectionTemplate::query()->create([
            'category' => 'PRECISION_AIR_CONDITIONER',
            'version' => 1,
            'created_by' => $user->id,
            'created_at' => now(),
        ]);
        $newerTemplate = InspectionTemplate::query()->create([
            'category' => 'PRECISION_AIR_CONDITIONER',
            'version' => 2,
            'created_by' => $user->id,
            'created_at' => now(),
        ]);
        $olderTemplate->items()->create([
            'inspection_item' => '이전 버전 항목',
            'standard' => '이전 기준',
            'input_template' => '이전 입력',
            'input_fields' => [],
            'sort_order' => 0,
        ]);
        $newerTemplate->items()->create([
            'inspection_item' => '최신 버전 항목',
            'standard' => '최신 기준',
            'input_template' => '최신 입력',
            'input_fields' => [],
            'sort_order' => 0,
        ]);

        $migration = require database_path('migrations/2026_10_10_000003_consolidate_inspection_template_lists.php');
        $migration->up();

        $this->actingAs($user, 'web')
            ->getJson('/api/inspection-templates?category=PRECISION_AIR_CONDITIONER')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.items.0.inspection_item', '이전 버전 항목')
            ->assertJsonPath('data.0.items.0.sort_order', 0)
            ->assertJsonPath('data.0.items.1.inspection_item', '최신 버전 항목')
            ->assertJsonPath('data.0.items.1.sort_order', 1);

        $this->assertDatabaseCount('inspection_templates', 3);
        $this->assertDatabaseCount('inspection_template_items', 4);

        $migration->up();
        $this->assertDatabaseCount('inspection_templates', 3);
        $this->assertDatabaseCount('inspection_template_items', 4);
    }

    public function test_category_specific_templates_are_saved_independently(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web');

        foreach (['UPS', 'FIRE_SUPPRESSION', 'VOICE_ALARM'] as $category) {
            $item = [
                'inspection_item' => "{$category} 점검사항",
            ];
            if ($category !== 'UPS') {
                $item['standard'] = '관리자 등록 기준';
            }
            if ($category !== 'FIRE_SUPPRESSION') {
                $item['input_template'] = '{text}';
            }

            $this->postJson('/api/inspection-templates', [
                'category' => $category,
                'items' => [$item],
            ])->assertCreated()->assertJsonPath('data.category', $category);
        }

        $this->assertDatabaseCount('inspection_templates', 3);
    }

    public function test_ups_template_uses_check_text_without_a_standard(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web')
            ->postJson('/api/inspection-templates', [
                'category' => 'UPS',
                'items' => [[
                    'inspection_item' => '배터리 전압 확인',
                    'input_template' => '전압:{text} V',
                ]],
            ])->assertCreated()
            ->assertJsonPath('data.items.0.standard', '')
            ->assertJsonPath('data.items.0.input_template', '전압:{text} V');

        $this->postJson('/api/inspection-templates', [
            'category' => 'UPS',
            'items' => [[
                'inspection_item' => '배터리 전압 확인',
                'standard' => '이 값은 허용하지 않음',
                'input_template' => '전압:{text} V',
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.standard']);
    }

    public function test_fire_suppression_template_uses_inspection_details_without_text_template(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web')
            ->postJson('/api/inspection-templates', [
                'category' => 'FIRE_SUPPRESSION',
                'items' => [[
                    'inspection_item' => '소화기 외관 확인',
                ]],
            ])->assertCreated()
            ->assertJsonPath('data.items.0.inspection_item', '소화기 외관 확인')
            ->assertJsonPath('data.items.0.standard', '');

        $this->postJson('/api/inspection-templates', [
            'category' => 'FIRE_SUPPRESSION',
            'items' => [[
                'inspection_item' => '소화기 외관 확인',
                'standard' => '외관 손상 및 압력 상태 확인',
                'input_template' => '{text}',
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.input_template']);
    }

    public function test_only_admin_can_create_inspection_templates_and_active_users_can_read_them(): void
    {
        $payload = [
            'category' => 'PRECISION_AIR_CONDITIONER',
            'items' => [['inspection_item' => '외관 확인', 'standard' => '이상 없음']],
        ];

        $this->actingAs($this->createUser('USER'), 'web');
        $this->postJson('/api/inspection-templates', $payload)->assertForbidden();
        $this->getJson('/api/inspection-templates')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/inspection-templates')->assertUnauthorized();
    }

    public function test_invalid_input_template_is_rejected(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web')
            ->postJson('/api/inspection-templates', [
                'category' => 'PRECISION_AIR_CONDITIONER',
                'items' => [[
                    'inspection_item' => '압축기 전류',
                    'standard' => '정상 범위',
                    'input_template' => str_repeat('x', 2001),
                ]],
            ])->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.input_template']);

        $this->postJson('/api/inspection-templates', [
            'category' => 'PRECISION_AIR_CONDITIONER',
            'items' => [[
                'inspection_item' => '압축기 전류',
                'input_template' => '{text} A',
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors(['items.0.standard']);
    }

    private function createUser(string $role): User
    {
        $user = User::factory()->create(['password' => Hash::make('test-password')]);
        $user->forceFill(['role' => $role, 'active' => true])->save();

        return $user;
    }
}