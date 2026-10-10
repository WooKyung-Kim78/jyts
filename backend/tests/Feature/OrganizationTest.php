<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrganizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_admin_can_save_organization_contact_details_and_map_image(): void
    {
        Storage::fake('local');
        $this->actingAs($this->createUser('ADMIN'), 'web');

        $organization = $this->postJson('/api/organizations', [
            'name' => '예시 고객사',
            'address' => '서울시 예시구 예시로 10',
            'contact_name' => '예시 담당자',
            'contact_phone' => '010-0000-0000',
        ])->assertCreated()
            ->assertJsonPath('data.address', '서울시 예시구 예시로 10')
            ->assertJsonPath('data.contact_name', '예시 담당자')
            ->assertJsonPath('data.contact_phone', '010-0000-0000')
            ->assertJsonPath('data.map_image_url', null)
            ->json('data');

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gqsAAAAASUVORK5CYII=');
        $upload = $this->post("/api/organizations/{$organization['id']}/map", [
            'image' => UploadedFile::fake()->createWithContent('map.png', $png),
        ], ['Accept' => 'application/json']);

        $upload->assertOk()->assertJsonPath('data.map_image_url', "/api/organizations/{$organization['id']}/map");
        $path = Organization::query()->findOrFail($organization['id'])->map_image_path;
        $this->assertStringStartsWith("organizations/{$organization['id']}/map/", $path);
        Storage::disk('local')->assertExists($path);

        $this->get("/api/organizations/{$organization['id']}/map")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->deleteJson("/api/organizations/{$organization['id']}/map")
            ->assertOk()
            ->assertJsonPath('data.map_image_url', null);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_users_can_read_contacts_but_cannot_change_or_upload_maps(): void
    {
        Storage::fake('local');
        $organization = Organization::query()->create([
            'name' => '예시 고객사',
            'contact_name' => '예시 담당자',
            'contact_phone' => '010-0000-0000',
        ]);
        $this->actingAs($this->createUser('USER'), 'web');
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gqsAAAAASUVORK5CYII=');

        $this->getJson('/api/organizations')
            ->assertOk()
            ->assertJsonPath('data.0.contact_name', '예시 담당자')
            ->assertJsonPath('data.0.contact_phone', '***-****-0000');
        $this->putJson("/api/organizations/{$organization->id}", ['name' => '변경 시도'])->assertForbidden();
        $this->post("/api/organizations/{$organization->id}/map", [
            'image' => UploadedFile::fake()->createWithContent('map.png', $png),
        ], ['Accept' => 'application/json'])->assertForbidden();
        $this->getJson("/api/organizations/{$organization->id}/map")->assertNotFound();
    }

    public function test_map_upload_rejects_unsupported_file_types(): void
    {
        Storage::fake('local');
        $organization = Organization::query()->create(['name' => '예시 고객사']);
        $this->actingAs($this->createUser('ADMIN'), 'web');

        $this->post("/api/organizations/{$organization->id}/map", [
            'image' => UploadedFile::fake()->create('map.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);
    }

    public function test_map_image_requires_authentication(): void
    {
        $organization = Organization::query()->create(['name' => '예시 고객사']);

        $this->getJson("/api/organizations/{$organization->id}/map")->assertUnauthorized();
    }

    public function test_business_routes_require_an_active_authenticated_user(): void
    {
        $this->getJson('/api/organizations')->assertUnauthorized();

        $this->actingAs($this->createUser('ADMIN', false), 'web')
            ->getJson('/api/organizations')->assertForbidden();
    }

    private function createUser(string $role, bool $active = true): User
    {
        $user = User::factory()->create(['password' => Hash::make('test-password')]);
        $user->forceFill(['role' => $role, 'active' => $active])->save();

        return $user;
    }
}