<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SpaFallbackTest extends TestCase
{
    private string $publicPath;

    protected function setUp(): void
    {
        parent::setUp();

        // Isolated public dir so tests never read or write the real build output.
        $this->publicPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'jyts-public-'.bin2hex(random_bytes(4));
        File::ensureDirectoryExists($this->publicPath);
        $this->app->usePublicPath($this->publicPath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicPath);

        parent::tearDown();
    }

    public function test_it_returns_503_when_the_frontend_is_not_built(): void
    {
        $this->get('/equipment')
            ->assertStatus(503)
            ->assertSee('pnpm build');
    }

    public function test_it_serves_index_html_for_client_routes(): void
    {
        File::ensureDirectoryExists($this->publicPath.'/app');
        File::put($this->publicPath.'/app/index.html', '<!doctype html><title>JYTS</title>');

        foreach (['/', '/equipment', '/admin/users'] as $path) {
            $response = $this->get($path);
            $response->assertOk();
            $this->assertStringContainsString('<title>JYTS</title>', $response->streamedContent());
        }
    }

    public function test_missing_static_files_are_not_served_as_the_spa(): void
    {
        File::ensureDirectoryExists($this->publicPath.'/app');
        File::put($this->publicPath.'/app/index.html', '<!doctype html><title>JYTS</title>');

        $this->get('/app/assets/missing.js')->assertNotFound();
        $this->get('/.env')->assertNotFound();
    }
}
