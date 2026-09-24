<?php

declare(strict_types=1);

use App\Enums\AuditableType;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\ModelRegistrationController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserEmailResetNotificationController;
use App\Http\Controllers\UserEmailVerificationController;
use App\Http\Controllers\UserEmailVerificationNotificationController;
use App\Http\Controllers\UserImpersonationController;
use App\Http\Controllers\UserPasswordController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\UserTwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

Route::middleware(['auth', 'verified'])->group(function (): void {

    Route::get('dashboard', [ModelRegistrationController::class, 'dashboard'])
        ->middleware('role_or_permission:user|admin|super-admin')
        ->name('dashboard');

    Route::prefix('modelos')->group(function (): void {
        Route::get('/', [ModelRegistrationController::class, 'index'])
            ->middleware('role_or_permission:admin|super-admin')
            ->name('models.index');
        Route::get('/cadastro', [ModelRegistrationController::class, 'create'])
            ->middleware('role_or_permission:admin|super-admin')
            ->name('model_registration');
        Route::get('/{model}/editar', [ModelRegistrationController::class, 'edit'])
            ->middleware('role_or_permission:admin|super-admin')
            ->name('models.edit');
        Route::put('/{model}', [ModelRegistrationController::class, 'update'])
            ->middleware('role_or_permission:admin|super-admin')
            ->name('models.update');
        Route::post('/', [ModelRegistrationController::class, 'store'])
            ->middleware('role_or_permission:admin|super-admin')
            ->name('models.store');
        Route::post('/gerar', [ModelRegistrationController::class, 'generate'])
            ->middleware('role_or_permission:user|admin|super-admin')
            ->name('documents.generate');
    });
});

Route::middleware('auth')->group(function (): void {
    // User...
    Route::delete('user/{user}', [UserController::class, 'destroy'])->name('user.destroy');
    Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::get('users/create', [UserController::class, 'createManaged'])->name('users.create');
    Route::post('users', [UserController::class, 'storeManaged'])->name('users.store');
    Route::get('users', [UserController::class, 'index'])->name('users.index');

    Route::resource('roles', RoleController::class)->except(['show']);

    // User Profile...
    Route::redirect('settings', '/settings/profile');
    Route::get('settings/profile', [UserProfileController::class, 'edit'])->name('user-profile.edit');
    Route::patch('settings/profile', [UserProfileController::class, 'update'])->name('user-profile.update');

    // User Password...
    Route::get('settings/password', [UserPasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [UserPasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    // Appearance...
    Route::get('settings/appearance', fn () => Inertia::render('appearance/update'))->name('appearance.edit');

    // User Two-Factor Authentication...
    Route::get('settings/two-factor', [UserTwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    // User Impersonation...
    Route::post('users/{user}/impersonate', [UserImpersonationController::class, 'store'])
        ->name('users.impersonate');
    Route::delete('impersonate', [UserImpersonationController::class, 'destroy'])
        ->name('users.impersonate.stop');

    // User Audit...
    Route::get('audit/{type}/{id}', [AuditController::class, 'show'])
        ->whereIn('type', array_column(AuditableType::cases(), 'value'))
        ->name('audit.show');
});

Route::middleware('guest')->group(function (): void {
    // User...
    Route::get('register', [UserController::class, 'create'])
        ->name('register');
    Route::post('register', [UserController::class, 'store'])
        ->name('register.store');

    // User Password...
    Route::get('reset-password/{token}', [UserPasswordController::class, 'create'])
        ->name('password.reset');
    Route::post('reset-password', [UserPasswordController::class, 'store'])
        ->name('password.store');

    // User Email Reset Notification...
    Route::get('forgot-password', [UserEmailResetNotificationController::class, 'create'])
        ->name('password.request');
    Route::post('forgot-password', [UserEmailResetNotificationController::class, 'store'])
        ->name('password.email');

    // Session...
    Route::get('login', [SessionController::class, 'create'])
        ->name('login');
    Route::post('login', [SessionController::class, 'store'])
        ->name('login.store');
});

Route::middleware('auth')->group(function (): void {
    // User Email Verification...
    Route::get('verify-email', [UserEmailVerificationNotificationController::class, 'create'])
        ->name('verification.notice');
    Route::post('email/verification-notification', [UserEmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    // User Email Verification...
    Route::get('verify-email/{id}/{hash}', [UserEmailVerificationController::class, 'update'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    // Session...
    Route::post('logout', [SessionController::class, 'destroy'])
        ->name('logout');
});
