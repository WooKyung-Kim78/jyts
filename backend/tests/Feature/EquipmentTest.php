<?php

namespace Tests\Feature;

use App\Models\Equipment;
use App\Models\EquipmentAttribute;
use App\Models\EquipmentMasterField;
use App\Models\EquipmentPhoto;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EquipmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_admin_can_manage_category_master_fields(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web');

        $field = $this->postJson('/api/equipment-master-fields', [
            'category' => 'UPS',
            'label' => '정격 용량',
            'field_type' => 'number',
            'required' => true,
            'sort_order' => 1,
        ])->assertCreated()
            ->assertJsonPath('data.label', '정격 용량')
            ->assertJsonPath('data.category', 'UPS')
            ->json('data');

        $this->getJson('/api/equipment-master-fields?category=UPS')
            ->assertOk()
            ->assertJsonPath('data.0.id', $field['id']);

        $this->putJson("/api/equipment-master-fields/{$field['id']}", [
            'category' => 'UPS',
            'label' => '정격 용량 (kVA)',
            'field_type' => 'number',
            'required' => true,
            'sort_order' => 1,
        ])->assertOk()->assertJsonPath('data.label', '정격 용량 (kVA)');

        $this->deleteJson("/api/equipment-master-fields/{$field['id']}")->assertOk();
        $this->getJson('/api/equipment-master-fields?category=UPS')->assertExactJson(['success' => true, 'data' => []]);
    }

    public function test_only_admin_can_change_master_fields(): void
    {
        $this->actingAs($this->createUser('USER'), 'web')
            ->postJson('/api/equipment-master-fields', [
                'category' => 'UPS',
                'label' => '정격 용량',
                'field_type' => 'number',
            ])->assertForbidden();
    }

    public function test_user_can_create_equipment_with_snapshotted_master_and_custom_fields(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $field = $this->createMasterField('UPS', '정격 용량', 'number', true);
        $this->actingAs($this->createUser('USER'), 'web');

        $equipment = $this->postJson('/api/equipment', [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-001',
            'name' => 'UPS 1호기',
            'category' => 'UPS',
            'inspection_cycle' => 'MONTHLY',
            'master_values' => [$field->id => '100'],
            'custom_fields' => [['label' => '설치 위치', 'value' => '전산실'] ],
        ])->assertCreated()
            ->assertJsonPath('data.organization_id', $organization->id)
            ->assertJsonPath('data.attributes.0.label', '정격 용량')
            ->assertJsonPath('data.attributes.0.value', '100')
            ->assertJsonPath('data.attributes.1.label', '설치 위치')
            ->json('data');

        $this->assertDatabaseCount('equipment_attributes', 2);
        $this->assertSame($equipment['id'], EquipmentAttribute::query()->firstOrFail()->equipment_id);
    }

    public function test_inactive_assignee_is_preserved_for_existing_equipment_but_cannot_be_newly_assigned(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $assignee = $this->createUser('USER');
        $equipment = Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-INACTIVE-ASSIGNEE',
            'name' => 'UPS 담당 장비',
            'category' => 'UPS',
            'assigned_user_id' => $assignee->id,
        ]);
        $assignee->forceFill(['active' => false])->save();
        $this->actingAs($this->createUser('USER'), 'web');

        $this->putJson("/api/equipment/{$equipment->id}", [
            'organization_id' => $organization->id,
            'equipment_code' => $equipment->equipment_code,
            'name' => $equipment->name,
            'assigned_user_id' => $assignee->id,
        ])->assertOk()->assertJsonPath('data.assigned_user.active', false);

        $otherInactive = $this->createUser('USER', false);
        $this->putJson("/api/equipment/{$equipment->id}", [
            'organization_id' => $organization->id,
            'equipment_code' => $equipment->equipment_code,
            'name' => $equipment->name,
            'assigned_user_id' => $otherInactive->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['assigned_user_id']);
    }

    public function test_user_can_assign_an_active_employee_to_equipment_and_keep_existing_assignment_after_termination(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $assignee = $this->createUser('USER');
        $this->actingAs($this->createUser('USER'), 'web');

        $equipment = $this->postJson('/api/equipment', [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-ASSIGNEE',
            'name' => 'UPS 담당자 지정',
            'category' => 'UPS',
            'inspection_cycle' => 'MONTHLY',
            'assigned_user_id' => $assignee->id,
        ])->assertCreated()
            ->assertJsonPath('data.assigned_user_id', (string) $assignee->id)
            ->assertJsonPath('data.assigned_user.name', $assignee->name)
            ->assertJsonMissingPath('data.assigned_user.email')
            ->json('data');

        $assignee->forceFill(['active' => false])->save();
        $this->getJson("/api/equipment/{$equipment['id']}")
            ->assertOk()
            ->assertJsonPath('data.assigned_user.active', false)
            ->assertJsonPath('data.assigned_user_id', (string) $assignee->id);

        $this->putJson("/api/equipment/{$equipment['id']}", [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-ASSIGNEE',
            'name' => 'UPS 담당자 지정',
            'assigned_user_id' => $assignee->id,
        ])->assertOk()->assertJsonPath('data.assigned_user_id', (string) $assignee->id);

        $otherInactive = $this->createUser('USER', false);
        $this->putJson("/api/equipment/{$equipment['id']}", [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-ASSIGNEE',
            'name' => 'UPS 담당자 지정',
            'assigned_user_id' => $otherInactive->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['assigned_user_id']);
    }

    public function test_equipment_rejects_a_master_field_from_a_different_category(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $field = $this->createMasterField('UPS', '정격 용량', 'number', true);
        $this->actingAs($this->createUser('USER'), 'web')
            ->postJson('/api/equipment', [
                'organization_id' => $organization->id,
                'equipment_code' => 'JY-AC-001',
                'name' => '항온항습기 1호기',
                'category' => 'PRECISION_AIR_CONDITIONER',
                'inspection_cycle' => 'MONTHLY',
                'master_values' => [$field->id => '100'],
            ])->assertUnprocessable();
    }

    public function test_equipment_can_be_registered_with_private_photo_uploads(): void
    {
        Storage::fake('local');
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $this->actingAs($this->createUser('USER'), 'web');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gqsAAAAASUVORK5CYII=');

        $equipment = $this->post('/api/equipment', [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-INITIAL-PHOTO',
            'name' => 'UPS 사진 포함 등록',
            'category' => 'UPS',
            'inspection_cycle' => 'MONTHLY',
            'photos' => [
                UploadedFile::fake()->createWithContent('front.png', $png),
                UploadedFile::fake()->createWithContent('label.png', $png),
            ],
        ], ['Accept' => 'application/json'])->assertCreated()->json('data');

        $this->assertCount(2, $equipment['photos']);
        foreach ($equipment['photos'] as $photo) {
            $storedPhoto = EquipmentPhoto::query()->findOrFail($photo['id']);
            $this->assertStringStartsWith("equipment/{$equipment['id']}/photos/", $storedPhoto->storage_path);
            Storage::disk('local')->assertExists($storedPhoto->storage_path);
        }
    }

    public function test_equipment_code_is_unique_for_active_records_and_reusable_after_soft_delete(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $this->actingAs($this->createUser('USER'), 'web');
        $payload = [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-UNIQUE',
            'name' => 'UPS 본체',
            'category' => 'UPS',
            'inspection_cycle' => 'MONTHLY',
        ];

        $this->postJson('/api/equipment', $payload)->assertCreated();
        $this->postJson('/api/equipment', $payload)->assertUnprocessable()->assertJsonValidationErrors(['equipment_code']);

        Equipment::query()->where('equipment_code', $payload['equipment_code'])->firstOrFail()->delete();
        $this->postJson('/api/equipment', $payload)->assertCreated();
    }

    public function test_equipment_cannot_be_copied_to_its_current_customer(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $source = Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-SAME',
            'name' => 'UPS 본체',
            'category' => 'UPS',
        ]);

        $this->actingAs($this->createUser('USER'), 'web')
            ->postJson("/api/equipment/{$source->id}/copies", [
                'organization_id' => $organization->id,
                'equipment_code' => 'JY-UPS-SAME-COPY',
            ])->assertUnprocessable()->assertJsonValidationErrors(['organization_id']);
    }

    public function test_user_can_update_installation_and_snapshot_values_without_changing_category(): void
    {
        $organization = Organization::query()->create(['name' => '기존 고객사']);
        $newOrganization = Organization::query()->create(['name' => '변경 고객사']);
        $equipment = Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-AC-EDIT',
            'name' => '항온항습기',
            'category' => 'PRECISION_AIR_CONDITIONER',
        ]);
        $attribute = $equipment->attributes()->create([
            'label' => '제조사',
            'field_type' => 'text',
            'value' => '기존 제조사',
            'sort_order' => 0,
        ]);
        $this->actingAs($this->createUser('USER'), 'web');

        $this->putJson("/api/equipment/{$equipment->id}", [
            'organization_id' => $newOrganization->id,
            'equipment_code' => 'JY-AC-EDIT-2',
            'name' => '변경 장비명',
            'attribute_values' => [$attribute->id => '새 제조사'],
        ])->assertOk()
            ->assertJsonPath('data.organization_id', $newOrganization->id)
            ->assertJsonPath('data.name', '변경 장비명')
            ->assertJsonPath('data.category', 'PRECISION_AIR_CONDITIONER')
            ->assertJsonPath('data.attributes.0.label', '제조사')
            ->assertJsonPath('data.attributes.0.value', '새 제조사');
    }

    public function test_inspection_cycle_is_required_on_create_updated_and_copied(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $target = Organization::query()->create(['name' => '다른 고객사']);
        $this->actingAs($this->createUser('USER'), 'web');
        $payload = [
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-CYCLE',
            'name' => 'UPS 주기',
            'category' => 'UPS',
        ];

        $this->postJson('/api/equipment', $payload)->assertUnprocessable()->assertJsonValidationErrors(['inspection_cycle']);
        $this->postJson('/api/equipment', [...$payload, 'inspection_cycle' => 'WEEKLY'])->assertUnprocessable()->assertJsonValidationErrors(['inspection_cycle']);
        $equipment = $this->postJson('/api/equipment', [...$payload, 'inspection_cycle' => 'QUARTERLY'])
            ->assertCreated()
            ->assertJsonPath('data.inspection_cycle', 'QUARTERLY')
            ->json('data');

        $update = ['organization_id' => $organization->id, 'equipment_code' => 'JY-UPS-CYCLE', 'name' => 'UPS 주기'];
        $this->putJson("/api/equipment/{$equipment['id']}", $update)->assertOk()->assertJsonPath('data.inspection_cycle', 'QUARTERLY');
        $this->putJson("/api/equipment/{$equipment['id']}", [...$update, 'inspection_cycle' => null])->assertUnprocessable();
        $this->putJson("/api/equipment/{$equipment['id']}", [...$update, 'inspection_cycle' => 'YEARLY'])->assertOk()->assertJsonPath('data.inspection_cycle', 'YEARLY');

        $this->postJson("/api/equipment/{$equipment['id']}/copies", [
            'organization_id' => $target->id,
            'equipment_code' => 'JY-UPS-CYCLE-2',
        ])->assertCreated()->assertJsonPath('data.inspection_cycle', 'YEARLY');
    }

    public function test_specifics_is_saved_updated_and_preserved_when_equipment_is_copied(): void
    {
        $sourceOrganization = Organization::query()->create(['name' => '예시 고객사']);
        $targetOrganization = Organization::query()->create(['name' => '다른 고객사']);
        $this->actingAs($this->createUser('USER'), 'web');

        $equipment = $this->postJson('/api/equipment', [
            'organization_id' => $sourceOrganization->id,
            'equipment_code' => 'JY-AC-NOTE-1',
            'name' => '항온항습기',
            'category' => 'PRECISION_AIR_CONDITIONER',
            'inspection_cycle' => 'MONTHLY',
            'specifics' => '등록 시 특이사항',
        ])->assertCreated()->assertJsonPath('data.specifics', '등록 시 특이사항')->json('data');

        $this->putJson("/api/equipment/{$equipment['id']}", [
            'organization_id' => $sourceOrganization->id,
            'equipment_code' => 'JY-AC-NOTE-1',
            'name' => '항온항습기',
            'specifics' => '수정된 특이사항',
        ])->assertOk()->assertJsonPath('data.specifics', '수정된 특이사항');

        $this->postJson("/api/equipment/{$equipment['id']}/copies", [
            'organization_id' => $targetOrganization->id,
            'equipment_code' => 'JY-AC-NOTE-2',
        ])->assertCreated()->assertJsonPath('data.specifics', '수정된 특이사항');
    }

    public function test_equipment_copy_creates_independent_attributes_and_photo_files(): void
    {
        Storage::fake('local');
        $sourceOrganization = Organization::query()->create(['name' => '원본 고객사']);
        $targetOrganization = Organization::query()->create(['name' => '복제 고객사']);
        $source = Equipment::query()->create([
            'organization_id' => $sourceOrganization->id,
            'equipment_code' => 'JY-UPS-OLD',
            'name' => 'UPS 본체',
            'category' => 'UPS',
        ]);
        $attribute = $source->attributes()->create([
            'label' => '정격 용량',
            'field_type' => 'number',
            'value' => '100',
            'sort_order' => 0,
        ]);
        $sourcePath = "equipment/{$source->id}/photos/source.png";
        Storage::disk('local')->put($sourcePath, 'independent image content');
        $source->photos()->create([
            'storage_path' => $sourcePath,
            'mime_type' => 'image/png',
            'size_bytes' => 25,
        ]);
        $this->actingAs($this->createUser('USER'), 'web');

        $copy = $this->postJson("/api/equipment/{$source->id}/copies", [
            'organization_id' => $targetOrganization->id,
            'equipment_code' => 'JY-UPS-NEW',
        ])->assertCreated()
            ->assertJsonPath('data.organization_id', $targetOrganization->id)
            ->assertJsonPath('data.copied_from_id', $source->id)
            ->assertJsonPath('data.attributes.0.value', '100')
            ->json('data');

        $this->assertNotSame($source->id, $copy['id']);
        $this->assertNotSame($attribute->id, $copy['attributes'][0]['id']);
        $this->assertDatabaseCount('equipment_attributes', 2);
        $this->assertDatabaseCount('equipment_photos', 2);
        $copiedPhoto = EquipmentPhoto::query()->where('equipment_id', $copy['id'])->firstOrFail();
        $this->assertNotSame($sourcePath, $copiedPhoto->storage_path);
        Storage::disk('local')->assertExists($copiedPhoto->storage_path);
        $this->assertSame('independent image content', Storage::disk('local')->get($copiedPhoto->storage_path));
    }

    public function test_admin_can_upload_photo_and_read_direct_file(): void
    {
        Storage::fake('local');
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $equipment = Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-PHOTO',
            'name' => 'UPS 본체',
            'category' => 'UPS',
        ]);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gqsAAAAASUVORK5CYII=');
        $this->actingAs($this->createUser('ADMIN'), 'web')
            ->post("/api/equipment/{$equipment->id}/photos", [
                'image' => UploadedFile::fake()->createWithContent('device.png', $png),
            ], ['Accept' => 'application/json'])->assertCreated();

        $photo = EquipmentPhoto::query()->firstOrFail();
        $this->get("/api/equipment-photos/{$photo->id}")->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/equipment-photos/{$photo->id}")->assertUnauthorized();
    }

    public function test_user_can_read_equipment_photo(): void
    {
        Storage::fake('local');
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $equipment = Equipment::query()->create([
            'organization_id' => $organization->id,
            'equipment_code' => 'JY-UPS-USER-PHOTO',
            'name' => 'UPS 본체',
            'category' => 'UPS',
        ]);
        $path = "equipment/{$equipment->id}/photos/example.png";
        Storage::disk('local')->put($path, 'private image');
        $photo = $equipment->photos()->create([
            'storage_path' => $path,
            'mime_type' => 'image/png',
            'size_bytes' => 13,
        ]);

        $this->actingAs($this->createUser('USER'), 'web')
            ->get("/api/equipment-photos/{$photo->id}")->assertOk();
    }

    private function createMasterField(string $category, string $label, string $fieldType, bool $required): EquipmentMasterField
    {
        return EquipmentMasterField::query()->create([
            'category' => $category,
            'label' => $label,
            'field_type' => $fieldType,
            'required' => $required,
            'active' => true,
        ]);
    }

    private function createUser(string $role, bool $active = true): User
    {
        $user = User::factory()->create(['password' => Hash::make('test-password')]);
        $user->forceFill(['role' => $role, 'active' => $active])->save();

        return $user;
    }
}