<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::guard('web')->attempt([
            'username' => $request->validated('username'),
            'password' => $request->validated('password'),
        ])) {
            return ApiResponse::fail(422, '이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        $user = Auth::guard('web')->user();

        if (! $user->active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return ApiResponse::fail(422, '이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        $request->session()->regenerate();
        $request->session()->put('user_auth_version', $user->auth_version);

        return ApiResponse::ok((new AuthenticatedUserResource($user))->resolve($request));
    }

    public function user(Request $request): JsonResponse
    {
        return ApiResponse::ok((new AuthenticatedUserResource($request->user()))->resolve($request));
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->forceFill(['password' => $request->validated('password')])->save();
        // Sanctum re-stores this session's password hash after the response; other sessions are logged out.
        $request->session()->regenerate();

        return ApiResponse::ok(['updated' => true]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return ApiResponse::ok(['authenticated' => false]);
    }
}