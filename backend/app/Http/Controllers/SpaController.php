<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves the built React SPA (public/app/index.html) for client-side routes.
 */
class SpaController extends Controller
{
    public function __invoke(Request $request): Response|BinaryFileResponse
    {
        if (! self::isClientRoute($request->path())) {
            abort(404);
        }

        $index = public_path('app/index.html');

        if (! is_file($index)) {
            return response('프런트엔드 빌드 산출물이 없습니다. 저장소 루트에서 pnpm build 를 실행하세요.', 503)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }

        return response()->file($index, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache, private',
        ]);
    }

    // Paths with a file extension are missing static assets, not SPA routes.
    public static function isClientRoute(string $path): bool
    {
        $path = trim($path, '/');

        if ($path === '') {
            return true;
        }

        if (preg_match('#^(api|sanctum)(/|$)#', $path) === 1) {
            return false;
        }

        return pathinfo($path, PATHINFO_EXTENSION) === '';
    }
}
