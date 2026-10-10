<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    public function test_health_endpoint_returns_success_envelope(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['success' => true, 'data' => ['status' => 'ok']]);
    }

    public function test_unknown_api_route_returns_json_not_found(): void
    {
        $this->getJson('/api/does-not-exist')
            ->assertNotFound()
            ->assertExactJson(['success' => false, 'message' => '요청한 대상을 찾을 수 없습니다.']);
    }

    public function test_unknown_api_route_returns_json_even_without_accept_header(): void
    {
        $this->get('/api/does-not-exist')
            ->assertNotFound()
            ->assertJson(['success' => false]);
    }

    public function test_wrong_method_returns_json_error(): void
    {
        $this->postJson('/api/health')
            ->assertStatus(405)
            ->assertExactJson(['success' => false, 'message' => '허용되지 않은 요청 방식입니다.']);
    }

    public function test_server_errors_do_not_expose_internal_details(): void
    {
        config(['app.debug' => true]);
        $this->app['router']->get('/api/__boom', fn () => throw new \RuntimeException('secret internal detail'));

        $response = $this->getJson('/api/__boom');

        $response->assertStatus(500)
            ->assertExactJson(['success' => false, 'message' => '서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.']);
        $this->assertStringNotContainsString('secret internal detail', $response->getContent());
    }

    public function test_tests_run_against_sqlite_in_memory_only(): void
    {
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }
}
