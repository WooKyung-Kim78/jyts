<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    // Intentionally does not touch the database or expose environment details.
    public function __invoke(): JsonResponse
    {
        return ApiResponse::ok(['status' => 'ok']);
    }
}
