<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\ActiveEmployeeResource;
use App\Http\Resources\EmployeeResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        return ApiResponse::ok(EmployeeResource::collection(
            User::query()->orderBy('name')->orderBy('email')->get()
        )->resolve());
    }

    public function active(): JsonResponse
    {
        Gate::authorize('viewActive', User::class);

        return ApiResponse::ok(ActiveEmployeeResource::collection(
            User::query()->where('active', true)->orderBy('name')->orderBy('id')->get()
        )->resolve());
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        Gate::authorize('create', User::class);
        $data = $request->validated();
        $role = $data['role'] ?? 'USER';
        unset($data['role']);
        $data['username'] = strtolower(trim($data['username']));
        $data['email'] = isset($data['email']) && $data['email'] !== '' ? mb_strtolower(trim($data['email'])) : null;
        $data['name'] = trim($data['name']);

        $employee = User::query()->create($data);
        $employee->forceFill(['role' => $role, 'active' => true])->save();

        return ApiResponse::ok((new EmployeeResource($employee))->resolve(), 201);
    }

    public function update(UpdateEmployeeRequest $request, User $employee): JsonResponse
    {
        Gate::authorize('update', $employee);
        $data = $request->validated();
        $data['username'] = strtolower(trim($data['username']));
        $data['email'] = isset($data['email']) && $data['email'] !== '' ? mb_strtolower(trim($data['email'])) : null;
        $data['name'] = trim($data['name']);

        if ($employee->username === 'admin' && $data['username'] !== 'admin') {
            throw ValidationException::withMessages(['username' => 'admin 아이디는 변경할 수 없습니다.']);
        }

        if ($employee->id === $request->user()->id && $data['role'] !== 'ADMIN') {
            throw ValidationException::withMessages(['role' => '본인의 관리자 권한은 변경할 수 없습니다.']);
        }

        if ($employee->active && $employee->role === 'ADMIN' && $data['role'] !== 'ADMIN') {
            $this->ensureAnotherActiveAdminExists($employee);
        }

        $roleChanged = $employee->role !== $data['role'];
        $usernameChanged = $employee->username !== $data['username'];
        $employee->fill(['username' => $data['username'], 'name' => $data['name'], 'email' => $data['email']]);
        $employee->forceFill(['role' => $data['role']]);
        if ($roleChanged || $usernameChanged) {
            $employee->auth_version++;
        }
        $employee->save();

        return ApiResponse::ok((new EmployeeResource($employee))->resolve());
    }

    public function terminate(Request $request, User $employee): JsonResponse
    {
        Gate::authorize('terminate', $employee);

        if ($employee->id === $request->user()->id) {
            throw ValidationException::withMessages(['employee' => '본인 계정은 퇴사 처리할 수 없습니다.']);
        }

        if ($employee->active && $employee->role === 'ADMIN') {
            $this->ensureAnotherActiveAdminExists($employee);
        }

        if ($employee->active) {
            $employee->forceFill(['active' => false, 'auth_version' => $employee->auth_version + 1])->save();
        }

        return ApiResponse::ok((new EmployeeResource($employee->refresh()))->resolve());
    }

    public function restore(User $employee): JsonResponse
    {
        Gate::authorize('restore', $employee);

        if (! $employee->active) {
            $employee->forceFill(['active' => true, 'auth_version' => $employee->auth_version + 1])->save();
        }

        return ApiResponse::ok((new EmployeeResource($employee->refresh()))->resolve());
    }

    private function ensureAnotherActiveAdminExists(User $employee): void
    {
        $anotherActiveAdminExists = User::query()
            ->where('role', 'ADMIN')
            ->where('active', true)
            ->where('id', '!=', $employee->id)
            ->exists();

        if (! $anotherActiveAdminExists) {
            throw ValidationException::withMessages(['role' => '활성 관리자 계정이 최소 한 개는 남아 있어야 합니다.']);
        }
    }
}