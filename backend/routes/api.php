<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\EquipmentMasterFieldController;
use App\Http\Controllers\EquipmentPhotoController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\InspectionController;
use App\Http\Controllers\InspectionPhotoController;
use App\Http\Controllers\InspectionTemplateController;
use App\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::middleware('auth:sanctum')->group(function (): void {
	Route::post('/logout', [AuthController::class, 'logout']);
	Route::get('/user', [AuthController::class, 'user']);
});

Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
	Route::put('/user/password', [AuthController::class, 'updatePassword'])->middleware('throttle:6,1');
	Route::get('/employees/active', [EmployeeController::class, 'active']);
	Route::get('/employees', [EmployeeController::class, 'index']);
	Route::post('/employees', [EmployeeController::class, 'store']);
	Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
	Route::post('/employees/{employee}/terminate', [EmployeeController::class, 'terminate']);
	Route::post('/employees/{employee}/restore', [EmployeeController::class, 'restore']);
	Route::get('/organizations/{organization}/map', [OrganizationController::class, 'showMap'])->name('organizations.map');
	Route::post('/organizations/{organization}/map', [OrganizationController::class, 'uploadMap']);
	Route::delete('/organizations/{organization}/map', [OrganizationController::class, 'deleteMap']);
	Route::apiResource('organizations', OrganizationController::class)->except('show');
	Route::apiResource('equipment-master-fields', EquipmentMasterFieldController::class)->except('show');
	Route::get('/inspection-templates', [InspectionTemplateController::class, 'index']);
	Route::post('/inspection-templates', [InspectionTemplateController::class, 'store']);
	Route::get('/inspections', [InspectionController::class, 'index']);
	Route::post('/inspections', [InspectionController::class, 'store']);
	Route::get('/inspections/{inspection}', [InspectionController::class, 'show']);
	Route::put('/inspections/{inspection}', [InspectionController::class, 'update']);
	Route::delete('/inspections/{inspection}', [InspectionController::class, 'destroy']);
	Route::post('/inspections/{inspection}/complete', [InspectionController::class, 'complete']);
	Route::scopeBindings()->group(function (): void {
		Route::put('/inspections/{inspection}/items/{item}', [InspectionController::class, 'updateItem']);
		Route::post('/inspections/{inspection}/items/{item}/photos', [InspectionPhotoController::class, 'store']);
	});
	Route::get('/inspection-photos/{photo}', [InspectionPhotoController::class, 'show']);
	Route::delete('/inspection-photos/{photo}', [InspectionPhotoController::class, 'destroy']);
	Route::get('/equipment', [EquipmentController::class, 'index']);
	Route::post('/equipment', [EquipmentController::class, 'store']);
	Route::get('/equipment/{equipment}', [EquipmentController::class, 'show']);
	Route::put('/equipment/{equipment}', [EquipmentController::class, 'update']);
	Route::delete('/equipment/{equipment}', [EquipmentController::class, 'destroy']);
	Route::post('/equipment/{equipment}/copies', [EquipmentController::class, 'copy']);
	Route::post('/equipment/{equipment}/photos', [EquipmentPhotoController::class, 'store']);
	Route::get('/equipment-photos/{equipmentPhoto}', [EquipmentPhotoController::class, 'show']);
	Route::delete('/equipment-photos/{equipmentPhoto}', [EquipmentPhotoController::class, 'destroy']);
});
