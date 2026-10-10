<?php

namespace Tests\Unit;

use App\Http\Controllers\SpaController;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SpaControllerTest extends TestCase
{
    /**
     * @return array<string, array{string, bool}>
     */
    public static function paths(): array
    {
        return [
            'root' => ['/', true],
            'client route' => ['equipment', true],
            'nested client route' => ['admin/users', true],
            'api' => ['api', false],
            'api endpoint' => ['api/health', false],
            'sanctum' => ['sanctum/csrf-cookie', false],
            'missing asset' => ['app/assets/index.js', false],
            'dotfile probe' => ['.env', false],
            'route starting with api word' => ['apiary', true],
        ];
    }

    #[DataProvider('paths')]
    public function test_it_detects_client_routes(string $path, bool $expected): void
    {
        $this->assertSame($expected, SpaController::isClientRoute($path));
    }
}
