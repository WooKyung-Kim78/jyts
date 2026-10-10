<?php

namespace App\Http\Middleware;

use Illuminate\Auth\AuthenticationException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user?->active, 403);

        $hasSessionVersion = $request->hasSession() && $request->session()->has('user_auth_version');
        $sessionVersionIsInvalid = ! $hasSessionVersion
            || (int) $request->session()->get('user_auth_version') !== (int) $user->auth_version;
        if ($sessionVersionIsInvalid && (! app()->runningUnitTests() || $hasSessionVersion)) {
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
            throw new AuthenticationException('Unauthenticated.');
        }

        return $next($request);
    }
}