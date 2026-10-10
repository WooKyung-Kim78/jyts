<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

// Excludes api/ and sanctum/ so this catch-all never shadows their routes.
Route::get('/{path?}', SpaController::class)->where('path', '^(?!(api|sanctum)(/|$)).*$');
