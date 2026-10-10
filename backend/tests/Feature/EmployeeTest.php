<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_admin_can_register_edit_terminate_and_restore_employee(): void
    {
        $admin = $this->createUser('ADMIN');
        $this->actingAs($admin, 'web');

        $employee = $this->postJson('/api/employees', [
            'username' => 'ABCDE',
            'name' => '예시 직원',
            'password' => 'temporary-password-123',
        ])->assertCreated()
            ->assertJsonPath('data.username', 'abcde')
            ->assertJsonPath('data.email', null)
            ->assertJsonPath('data.name', '예시 직원')
            ->assertJsonPath('data.role', 'USER')
            ->assertJsonPath('data.active', true)
            ->json('data');

        $storedEmployee = User::query()->findOrFail($employee['id']);
        $this->assertTrue(Hash::check('temporary-password-123', $storedEmployee->password));

        $this->putJson("/api/employees/{$employee['id']}", [
            'username' => 'ABCDE',
            'email' => 'staff@example.test',
            'name' => '수정 직원명',
            'role' => 'USER',
        ])->assertOk()->assertJsonPath('data.name', '수정 직원명');

        $beforeTerminationVersion = $storedEmployee->auth_version;
        $this->postJson("/api/employees/{$employee['id']}/terminate")
            ->assertOk()->assertJsonPath('data.active', false);
        $storedEmployee->refresh();
        $this->assertSame($beforeTerminationVersion + 1, $storedEmployee->auth_version);

        $this->postJson("/api/employees/{$employee['id']}/restore")
            ->assertOk()->assertJsonPath('data.active', true);
        $this->assertSame($beforeTerminationVersion + 2, $storedEmployee->fresh()->auth_version);
    }

    public function test_employee_username_is_case_insensitive_and_must_be_five_letters(): void
    {
        $this->actingAs($this->createUser('ADMIN'), 'web');
        $this->postJson('/api/employees', [
            'username' => 'abcde',
            'name' => '첫 직원',
            'password' => 'temporary-password-123',
        ])->assertCreated();

        $this->postJson('/api/employees', [
            'username' => 'ABCDE',
            'name' => '중복 직원',
            'password' => 'temporary-password-123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['username']);

        $this->postJson('/api/employees', [
            'username' => 'AB12',
            'name' => '잘못된 아이디',
            'password' => 'temporary-password-123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['username']);
    }

    public function test_only_admin_can_manage_employees_and_active_list_hides_inactive_users(): void
    {
        $employee = $this->createUser('USER');
        $inactive = $this->createUser('USER', false);

        $this->actingAs($employee, 'web')
            ->getJson('/api/employees')->assertForbidden();
        $this->getJson('/api/employees/active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $employee->id)
            ->assertJsonMissingPath('data.0.email');
        $this->postJson('/api/employees', [
            'username' => 'block',
            'name' => '권한 없는 생성',
            'password' => 'temporary-password-123',
        ])->assertForbidden();

    }

    public function test_admin_can_restore_an_inactive_employee(): void
    {
        $inactive = $this->createUser('USER', false);
        $this->actingAs($this->createUser('ADMIN'), 'web')
            ->postJson("/api/employees/{$inactive->id}/restore")
            ->assertOk()->assertJsonPath('data.active', true);
    }

    public function test_admin_cannot_terminate_self_or_remove_the_last_active_admin(): void
    {
        $admin = $this->createUser('ADMIN');
        $this->actingAs($admin, 'web');

        $this->postJson("/api/employees/{$admin->id}/terminate")
            ->assertUnprocessable()->assertJsonValidationErrors(['employee']);

        $this->putJson("/api/employees/{$admin->id}", [
            'username' => $admin->username,
            'email' => $admin->email,
            'name' => $admin->name,
            'role' => 'USER',
        ])->assertUnprocessable()->assertJsonValidationErrors(['role']);
    }

    public function test_reserved_admin_username_cannot_be_changed(): void
    {
        $admin = User::factory()->create([
            'username' => 'admin',
            'email' => 'wkkim97@gmail.com',
            'password' => Hash::make('test-password'),
        ]);
        $admin->forceFill(['role' => 'ADMIN', 'active' => true])->save();
        $this->actingAs($this->createUser('ADMIN'), 'web');

        $this->putJson("/api/employees/{$admin->id}", [
            'username' => 'other',
            'name' => $admin->name,
            'role' => 'ADMIN',
        ])->assertUnprocessable()->assertJsonValidationErrors(['username']);
    }

    private function createUser(string $role, bool $active = true): User
    {
        $user = User::factory()->create(['password' => Hash::make('test-password')]);
        $user->forceFill(['role' => $role, 'active' => $active])->save();

        return $user;
    }
}
