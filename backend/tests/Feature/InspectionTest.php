<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\Inspection;
use App\Models\InspectionItemPhoto;
use App\Models\InspectionTemplate;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InspectionTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gqsAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_user_starts_a_draft_with_a_master_snapshot_and_resumes_it(): void
    {
        $user = $this->createUser('USER');
        $equipment = $this->createEquipment();
        $template = $this->createTemplate();

        $first = $this->actAs($user)
            ->postJson('/api/inspections', ['equipment_id' => $equipment->id])
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.can_edit', true)
            ->assertJsonPath('data.items.0.inspection_item', '압축기 전류 측정')
            ->assertJsonPath('data.items.0.input_types', ['num', 'num', 'text'])
            ->assertJsonPath('data.items.0.input_values', ['', '', ''])
            ->assertJsonPath('data.items.1.input_types', [])
            ->json('data');

        $template->items()->update(['inspection_item' => '마스터 변경 후 항목']);

        $this->postJson('/api/inspections', ['equipment_id' => $equipment->id])
            ->assertOk()
            ->assertJsonPath('data.id', $first['id'])
            ->assertJsonPath('data.items.0.inspection_item', '압축기 전류 측정');
        $this->assertDatabaseCount('inspections', 1);

        $this->getJson("/api/inspections?equipment_id={$equipment->id}&status=DRAFT")
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.created_by.name', $user->name)
            ->assertJsonMissingPath('data.items.0.items');
    }

    public function test_start_requires_an_inspection_master(): void
    {
        $this->actAs($this->createUser('USER'))
            ->postJson('/api/inspections', ['equipment_id' => $this->createEquipment()->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['equipment_id']);
    }

    public function test_item_save_validates_input_counts_and_numbers(): void
    {
        $user = $this->createUser('USER');
        $inspection = $this->startInspection($user);
        $item = $inspection->items()->orderBy('sort_order')->firstOrFail();
        $url = "/api/inspections/{$inspection->id}/items/{$item->id}";

        $this->actAs($user)
            ->putJson($url, ['input_values' => ['1', '2'], 'result' => 'GOOD'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['input_values']);

        $this->putJson($url, ['input_values' => ['1.5', 'abc', '메모'], 'result' => 'GOOD'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['input_values.1']);

        $this->putJson($url, ['input_values' => [' 12.5 ', '-3', '정상 '], 'result' => 'GOOD', 'remarks' => ''])
            ->assertOk()
            ->assertJsonPath('data.input_values', ['12.5', '-3', '정상'])
            ->assertJsonPath('data.result', 'GOOD')
            ->assertJsonPath('data.remarks', null);
        $this->assertNotNull($item->fresh()->saved_at);
    }

    public function test_only_author_or_admin_can_edit_until_email_is_sent(): void
    {
        $author = $this->createUser('USER');
        $inspection = $this->startInspection($author);
        [$first, $second] = $inspection->items()->orderBy('sort_order')->get()->all();
        $payload = ['input_values' => ['1', '2', '정상'], 'result' => 'GOOD'];

        $this->actAs($this->createUser('USER'))
            ->putJson("/api/inspections/{$inspection->id}/items/{$first->id}", $payload)
            ->assertForbidden();
        $this->getJson("/api/inspections/{$inspection->id}")
            ->assertOk()
            ->assertJsonPath('data.can_edit', false);

        $this->actAs($author)
            ->putJson("/api/inspections/{$inspection->id}/items/{$first->id}", $payload)
            ->assertOk();
        $this->postJson("/api/inspections/{$inspection->id}/complete")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
        $this->putJson("/api/inspections/{$inspection->id}/items/{$second->id}", ['input_values' => [], 'result' => 'BAD', 'remarks' => '필터 오염'])
            ->assertOk();
        $this->postJson("/api/inspections/{$inspection->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'COMPLETED');

        $this->putJson("/api/inspections/{$inspection->id}/items/{$second->id}", ['input_values' => [], 'result' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['result']);
        $this->putJson("/api/inspections/{$inspection->id}/items/{$second->id}", ['input_values' => [], 'result' => 'GOOD'])
            ->assertOk();

        $this->actAs($this->createUser('ADMIN'))
            ->putJson("/api/inspections/{$inspection->id}/items/{$second->id}", ['input_values' => [], 'result' => 'BAD'])
            ->assertOk();

        $inspection->forceFill(['emailed_at' => now()])->save();
        $this->putJson("/api/inspections/{$inspection->id}/items/{$second->id}", ['input_values' => [], 'result' => 'GOOD'])
            ->assertForbidden();
    }

    public function test_item_must_belong_to_the_inspection(): void
    {
        $user = $this->createUser('USER');
        $inspection = $this->startInspection($user);
        $otherInspection = $this->startInspection($this->createUser('USER'));
        $otherItem = $otherInspection->items()->firstOrFail();

        $this->actAs($user)
            ->putJson("/api/inspections/{$inspection->id}/items/{$otherItem->id}", ['input_values' => ['1', '2', 'a'], 'result' => 'GOOD'])
            ->assertNotFound();
    }

    public function test_photos_are_private_and_follow_edit_permissions(): void
    {
        Storage::fake('local');
        $author = $this->createUser('USER');
        $inspection = $this->startInspection($author);
        $item = $inspection->items()->firstOrFail();

        $this->actAs($author)
            ->post("/api/inspections/{$inspection->id}/items/{$item->id}/photos", [
                'image' => UploadedFile::fake()->createWithContent('site.png', base64_decode(self::PNG)),
            ], ['Accept' => 'application/json'])
            ->assertCreated();
        $this->post("/api/inspections/{$inspection->id}/items/{$item->id}/photos", [
            'image' => UploadedFile::fake()->create('report.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $photo = InspectionItemPhoto::query()->firstOrFail();
        $this->assertStringStartsWith("inspections/{$inspection->id}/", $photo->storage_path);
        Storage::disk('local')->assertExists($photo->storage_path);
        $this->getJson("/api/inspections/{$inspection->id}")
            ->assertJsonPath('data.items.0.photos.0.url', "/api/inspection-photos/{$photo->id}");

        $this->actAs($this->createUser('USER'))
            ->get("/api/inspection-photos/{$photo->id}")->assertOk();
        $this->deleteJson("/api/inspection-photos/{$photo->id}")->assertForbidden();

        $this->actAs($author)
            ->deleteJson("/api/inspection-photos/{$photo->id}")->assertOk();
        Storage::disk('local')->assertMissing($photo->storage_path);

        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/inspections/{$inspection->id}")->assertUnauthorized();
    }

    public function test_previous_completed_values_are_returned_for_reference(): void
    {
        $user = $this->createUser('USER');
        $previous = $this->startInspection($user);
        foreach ($previous->items as $item) {
            $this->actAs($user)->putJson("/api/inspections/{$previous->id}/items/{$item->id}", [
                'input_values' => $item->sort_order === 0 ? ['10', '20', '정상'] : [],
                'result' => 'GOOD',
            ])->assertOk();
        }
        $this->postJson("/api/inspections/{$previous->id}/complete")->assertOk();
        $this->travel(1)->minutes();

        $this->postJson('/api/inspections', ['equipment_id' => $previous->equipment_id])
            ->assertCreated()
            ->assertJsonPath('data.items.0.previous_values', ['10', '20', '정상'])
            ->assertJsonPath('data.items.0.input_values', ['', '', '']);
    }

    public function test_report_remarks_follow_edit_permissions_and_list_is_ordered_by_inspection_date(): void
    {
        $author = $this->createUser('USER');
        $older = $this->startInspection($author);
        $older->forceFill(['inspected_on' => '2026-09-01'])->save();
        $newer = $this->startInspection($author);

        $this->actAs($author)
            ->putJson("/api/inspections/{$newer->id}", ['remarks' => '  고객사 요청으로 필터 교체 예정 '])
            ->assertOk()
            ->assertJsonPath('data.remarks', '고객사 요청으로 필터 교체 예정');
        $this->getJson('/api/inspections')
            ->assertOk()
            ->assertJsonPath('data.items.0.id', $newer->id)
            ->assertJsonPath('data.items.0.equipment.organization_name', '예시 고객사')
            ->assertJsonPath('data.items.1.id', $older->id);

        $this->actAs($this->createUser('USER'))
            ->putJson("/api/inspections/{$newer->id}", ['remarks' => '권한 없는 수정'])
            ->assertForbidden();

        $this->actAs($this->createUser('ADMIN'))
            ->putJson("/api/inspections/{$newer->id}", ['remarks' => null])
            ->assertOk()
            ->assertJsonPath('data.remarks', null);

        $newer->forceFill(['emailed_at' => now()])->save();
        $this->putJson("/api/inspections/{$newer->id}", ['remarks' => '발송 후 수정'])
            ->assertForbidden();
    }

    public function test_inspection_date_defaults_to_today_and_can_be_changed(): void
    {
        $author = $this->createUser('USER');
        $inspection = $this->startInspection($author);
        $this->assertSame(now('Asia/Seoul')->toDateString(), $inspection->inspected_on->toDateString());

        $this->actAs($author)
            ->putJson("/api/inspections/{$inspection->id}", ['inspected_on' => '2026-10-08'])
            ->assertOk()
            ->assertJsonPath('data.inspected_on', '2026-10-08');
        $this->putJson("/api/inspections/{$inspection->id}", ['inspected_on' => '2026-13-40'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['inspected_on']);
        $this->putJson("/api/inspections/{$inspection->id}", ['inspected_on' => null])
            ->assertUnprocessable();

        $this->actAs($this->createUser('USER'))
            ->putJson("/api/inspections/{$inspection->id}", ['inspected_on' => '2026-10-01'])
            ->assertForbidden();
    }

    public function test_list_is_paginated_by_one_hundred(): void
    {
        $user = $this->createUser('USER');
        $base = $this->startInspection($user);
        foreach (range(1, 100) as $_) {
            $base->replicate()->forceFill(['status' => 'COMPLETED', 'inspected_on' => '2026-01-01'])->save();
        }

        $this->actAs($user)->getJson('/api/inspections')
            ->assertOk()
            ->assertJsonCount(100, 'data.items')
            ->assertJsonPath('data.items.0.id', $base->id)
            ->assertJsonPath('data.meta', ['current_page' => 1, 'last_page' => 2, 'per_page' => 100, 'total' => 101]);
        $this->getJson('/api/inspections?page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.meta.current_page', 2);
        $this->getJson('/api/inspections?page=0')->assertUnprocessable();
    }

    public function test_author_or_admin_can_delete_draft_or_completed_inspection_before_email(): void
    {
        $author = $this->createUser('USER');
        $draft = $this->startInspection($author);
        $emailed = $this->startInspection($author);
        $emailed->forceFill(['status' => 'COMPLETED', 'emailed_at' => now()])->save();
        $completed = $this->startInspection($author);
        $completed->forceFill(['status' => 'COMPLETED', 'completed_at' => now()])->save();

        $this->actAs($this->createUser('USER'))
            ->deleteJson("/api/inspections/{$draft->id}")->assertForbidden();

        $this->actAs($author)
            ->getJson("/api/inspections/{$draft->id}")->assertJsonPath('data.can_delete', true);
        $this->deleteJson("/api/inspections/{$draft->id}")->assertOk()->assertJsonPath('data.deleted', true);
        $this->getJson("/api/inspections/{$draft->id}")->assertNotFound();
        $this->deleteJson("/api/inspections/{$emailed->id}")->assertForbidden();
        $this->assertSoftDeleted('inspections', ['id' => $draft->id, 'deleted_by' => $author->id]);

        $this->actAs($this->createUser('ADMIN'))
            ->deleteJson("/api/inspections/{$completed->id}")->assertOk();
        $this->getJson('/api/inspections')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $emailed->id)
            ->assertJsonPath('data.items.0.can_delete', false);
    }

    private function startInspection(User $user): Inspection
    {
        $equipment = $this->createEquipment();
        if (! InspectionTemplate::query()->exists()) {
            $this->createTemplate();
        }
        $id = $this->actAs($user)
            ->postJson('/api/inspections', ['equipment_id' => $equipment->id])
            ->assertCreated()
            ->json('data.id');

        return Inspection::query()->with('items')->findOrFail($id);
    }

    private function createTemplate(): InspectionTemplate
    {
        $template = InspectionTemplate::query()->create([
            'category' => 'PRECISION_AIR_CONDITIONER',
            'version' => 1,
            'created_at' => now(),
        ]);
        $template->items()->create([
            'inspection_item' => '압축기 전류 측정',
            'standard' => '정격 전류 이내',
            'input_template' => '{num} ~ {num} A, 상태:{text}',
            'input_fields' => [],
            'sort_order' => 0,
        ]);
        $template->items()->create([
            'inspection_item' => '필터 상태 확인',
            'standard' => '오염 없음',
            'input_template' => '',
            'input_fields' => [],
            'sort_order' => 1,
        ]);

        return $template;
    }

    private function createEquipment(): Equipment
    {
        static $sequence = 0;
        $sequence++;
        $organization = Organization::query()->create(['name' => '예시 고객사']);

        return Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => "JY-HVAC-{$sequence}",
            'name' => '항온항습기',
            'category' => 'PRECISION_AIR_CONDITIONER',
        ]);
    }

    // Sanctum keeps the previous user's password hash in the session, so reset it when switching users.
    private function actAs(User $user): static
    {
        $this->flushSession();
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'web');
    }

    private function createUser(string $role): User
    {
        $user = User::factory()->create(['password' => Hash::make('test-password')]);
        $user->forceFill(['role' => $role, 'active' => true])->save();

        return $user;
    }
}
