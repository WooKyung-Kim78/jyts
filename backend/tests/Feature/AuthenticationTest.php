<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_user_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_returns_user_profile_from_the_database(): void
    {
        $user = $this->createUser([
            'name' => '테스트 사용자',
            'username' => 'abcde',
            'email' => 'user@example.test',
            'password' => Hash::make('correct-password'),
            'role' => 'USER',
        ]);

        $this->postJson('/api/login', [
            'username' => 'ABCDE',
            'password' => 'correct-password',
            'role' => 'ADMIN',
        ])->assertOk()->assertExactJson([
            'success' => true,
            'data' => [
                'id' => (string) $user->id,
                'username' => 'abcde',
                'email' => 'user@example.test',
                'display_name' => '테스트 사용자',
                'role' => 'USER',
                'active' => true,
            ],
        ]);

        $this->getJson('/api/user')->assertOk()->assertJsonPath('data.role', 'USER');
    }

    public function test_invalid_credentials_use_a_generic_message(): void
    {
        $this->createUser(['username' => 'abcde', 'email' => 'user@example.test']);

        $expected = ['success' => false, 'message' => '이메일 또는 비밀번호가 올바르지 않습니다.'];

        $this->postJson('/api/login', [
            'username' => 'abcde',
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertExactJson($expected);

        $this->postJson('/api/login', [
            'username' => 'zzzzz',
            'password' => 'wrong-password',
        ])->assertUnprocessable()->assertExactJson($expected);
    }

    public function test_inactive_users_cannot_login_or_access_business_endpoints(): void
    {
        $user = $this->createUser([
            'email' => 'inactive@example.test',
            'username' => 'inact',
            'password' => Hash::make('correct-password'),
            'active' => false,
        ]);

        $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => 'correct-password',
        ])->assertUnprocessable()
            ->assertExactJson(['success' => false, 'message' => '이메일 또는 비밀번호가 올바르지 않습니다.']);

        Route::get('/api/__business-test', fn () => response()->json(['success' => true]))
            ->middleware(['auth:sanctum', 'active']);

        $this->actingAs($user, 'web')->getJson('/api/__business-test')->assertForbidden();
    }

    public function test_old_session_cannot_access_business_endpoints_after_auth_version_changes(): void
    {
        $user = $this->createUser([
            'email' => 'versioned@example.test',
            'username' => 'versn',
            'password' => Hash::make('correct-password'),
        ]);

        $login = $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => 'correct-password',
        ])->assertOk();
        $login->assertSessionHas('user_auth_version', 0);

        $user->forceFill(['auth_version' => $user->auth_version + 1])->save();
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/equipment')->assertUnauthorized();
    }

    public function test_logout_invalidates_the_authenticated_session(): void
    {
        $user = $this->createUser(['username' => 'logou', 'password' => Hash::make('correct-password')]);
        $this->postJson('/api/login', [
            'username' => $user->username,
            'password' => 'correct-password',
        ])->assertOk();

        $this->postJson('/api/logout')->assertOk()
            ->assertExactJson(['success' => true, 'data' => ['authenticated' => false]]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_user_can_change_own_password_with_current_password(): void
    {
        $user = $this->createUser(['username' => 'chpwd', 'password' => Hash::make('current-pass')]);
        $this->postJson('/api/login', ['username' => 'chpwd', 'password' => 'current-pass'])->assertOk();

        $this->putJson('/api/user/password', [
            'current_password' => 'wrong-pass',
            'password' => 'new-pass1',
            'password_confirmation' => 'new-pass1',
        ])->assertUnprocessable()->assertJsonValidationErrors(['current_password']);
        $this->putJson('/api/user/password', [
            'current_password' => 'current-pass',
            'password' => 'short7!',
            'password_confirmation' => 'short7!',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
        $this->putJson('/api/user/password', [
            'current_password' => 'current-pass',
            'password' => 'new-pass1',
            'password_confirmation' => 'other-pass',
        ])->assertUnprocessable()->assertJsonValidationErrors(['password']);

        $this->putJson('/api/user/password', [
            'current_password' => 'current-pass',
            'password' => 'new-pass1',
            'password_confirmation' => 'new-pass1',
        ])->assertOk()->assertJsonPath('data.updated', true);

        $this->assertTrue(Hash::check('new-pass1', $user->fresh()->password));
        $this->getJson('/api/user')->assertOk();
    }

    public function test_login_is_rate_limited(): void
    {
        $this->createUser(['username' => 'limit']);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'username' => 'LIMIT',
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/login', [
            'username' => 'limit',
            'password' => 'wrong-password',
        ])->assertTooManyRequests();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createUser(array $attributes = []): User
    {
        $protected = array_intersect_key($attributes, array_flip(['role', 'active']));
        $user = User::factory()->create(array_diff_key($attributes, $protected));

        if ($protected !== []) {
            $user->forceFill($protected)->save();
        }

        return $user;
    }
}