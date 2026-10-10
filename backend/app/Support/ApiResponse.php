<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * JSON envelope shared by every API endpoint: { success, data } or { success, message, errors? }.
 */
final class ApiResponse
{
    private const STATUS_MESSAGES = [
        400 => '잘못된 요청입니다.',
        401 => '로그인이 필요합니다.',
        403 => '권한이 없습니다.',
        404 => '요청한 대상을 찾을 수 없습니다.',
        405 => '허용되지 않은 요청 방식입니다.',
        419 => '세션이 만료되었습니다. 페이지를 새로고침한 후 다시 시도하세요.',
        422 => '입력값을 확인하세요.',
        429 => '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
        500 => '서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
        503 => '서비스를 일시적으로 사용할 수 없습니다.',
    ];

    public static function ok(mixed $data = null, int $status = 200): JsonResponse
    {
        return new JsonResponse(['success' => true, 'data' => $data], $status);
    }

    /**
     * @param  array<string, list<string>>|null  $errors
     */
    public static function fail(int $status, ?string $message = null, ?array $errors = null): JsonResponse
    {
        $body = ['success' => false, 'message' => $message ?? self::messageForStatus($status)];

        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        return new JsonResponse($body, $status);
    }

    // Exception messages are never echoed because they may contain internal details.
    public static function fromException(Throwable $e): ?JsonResponse
    {
        return match (true) {
            $e instanceof HttpResponseException => null,
            $e instanceof AuthenticationException => self::fail(401),
            $e instanceof ValidationException => self::fail(422, null, $e->errors()),
            $e instanceof HttpExceptionInterface => self::fail($e->getStatusCode()),
            default => self::fail(500),
        };
    }

    public static function messageForStatus(int $status): string
    {
        return self::STATUS_MESSAGES[$status] ?? '요청을 처리하지 못했습니다.';
    }
}
