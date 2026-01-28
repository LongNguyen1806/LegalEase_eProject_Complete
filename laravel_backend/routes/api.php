<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MasterDataController;
use App\Http\Controllers\Api\LawyerPublicController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\LawyerManagementController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\AiBotController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ContentPublicController;
use App\Http\Controllers\Api\BookingScheduleController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminFinanceController;
use App\Http\Controllers\Api\Admin\AdminContentController;
use App\Http\Controllers\Api\Admin\AdminAppointmentController;
use App\Http\Controllers\Api\NotificationController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
| Endpoints accessible without authentication: Discovery, Static Data, & AI.
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Password Recovery ---
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/notifications/stream', [NotificationController::class, 'stream']);

// System lookups and configuration
Route::get('/master-data', [MasterDataController::class, 'index']);
Route::get('/locations', [MasterDataController::class, 'getLocations']);
Route::get('/specializations', [MasterDataController::class, 'getSpecializations']);

// Lawyer discovery and public profiles
Route::get('/lawyers', [LawyerPublicController::class, 'index']);
Route::get('/lawyers/{id}', [LawyerPublicController::class, 'show']);
Route::get('/lawyers/{id}/reviews', [LawyerPublicController::class, 'getReviews']);
Route::get('/featured-lawyers', [LawyerPublicController::class, 'getFeaturedLawyers']);

// Public Q&A and Knowledge Base
Route::get('/community/questions', [CommunityController::class, 'index']);
Route::get('/community/questions/{id}', [CommunityController::class, 'show']);
Route::post('/ai/chat', [AiBotController::class, 'chat']);
Route::get('/laws/search', [AiBotController::class, 'searchLaws']);
Route::get('/contents', [ContentPublicController::class, 'index']);
Route::get('/contents/{id}', [ContentPublicController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes (Sanctum)
|--------------------------------------------------------------------------
| Routes requiring a valid bearer token.
*/
Route::middleware('auth:sanctum')->group(function () {

    // Common Account & Notification management
    Route::get('/user-info', [AuthController::class, 'getUserInfo']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount']);
        Route::put('/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
        Route::put('/mark-all-as-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
       Route::delete('/', [NotificationController::class, 'destroyAll']);
    });

    /*
    |--------------------------------------------------------------------------
    | Admin Routes (Role 1)
    |--------------------------------------------------------------------------
    | System administration: Finance, Moderation, User Control, & AI Training.
    */
    Route::middleware('role:1')->prefix('admin')->group(function () {

        // Financial & Dashboard Stats
        Route::get('/dashboard', [AdminFinanceController::class, 'getDashboardStats']);
        Route::get('/revenue', [AdminFinanceController::class, 'getRevenueStats']);
        Route::get('/revenue/refunds', [AdminFinanceController::class, 'getRefundRequests']);
        Route::post('/revenue/refunds/{id}', [AdminFinanceController::class, 'processRefund']);

        // User & Verification Oversight
        Route::get('/users', [AdminUserController::class, 'getUsers']);
        Route::get('/users/{id}', [AdminUserController::class, 'getUserDetails']);
        Route::patch('/users/{id}/status', [AdminUserController::class, 'toggleUserStatus']);
        Route::delete('/users/{id}', [AdminUserController::class, 'deleteUser']);
        Route::get('/verifications/pending', [AdminUserController::class, 'getPendingVerifications']);
        Route::post('/verifications/{id}/approve', [AdminUserController::class, 'approveVerification']);
        Route::post('/verifications/{id}/reject', [AdminUserController::class, 'rejectVerification']);

        // CMS & Audit Logs
        Route::get('/content', [AdminContentController::class, 'getContent']);
        Route::post('/content', [AdminContentController::class, 'storeContent']);
        Route::put('/content/{id}', [AdminContentController::class, 'updateContent']);
        Route::delete('/content/{id}', [AdminContentController::class, 'deleteContent']);
        Route::get('/logs', [AdminContentController::class, 'getAuditLogs']);
        Route::post('/content/upload-inline-image', [AdminContentController::class, 'uploadInlineImage']);

        // Appointment Management
        Route::get('/appointments', [AdminAppointmentController::class, 'index']);
        Route::get('/appointments/{id}', [AdminAppointmentController::class, 'show']);
        Route::put('/appointments/{id}/cancel', [AdminAppointmentController::class, 'cancel']);
        Route::delete('/appointments/{id}', [AdminAppointmentController::class, 'destroy']);

        // Community Moderation (Q&A)
        Route::get('/qa/questions/pending', [CommunityController::class, 'getPendingQuestions']);
        Route::patch('/qa/questions/{id}/approve', [CommunityController::class, 'approveQuestion']);
        Route::delete('/qa/questions/{id}', [CommunityController::class, 'deleteQuestion']);
        Route::get('/qa/answers/pending', [CommunityController::class, 'getPendingAnswers']);
        Route::patch('/qa/answers/{id}/approve', [CommunityController::class, 'approveAnswer']);
        Route::delete('/qa/answers/{id}', [CommunityController::class, 'deleteAnswer']);

        // AI Knowledge Base & Logs
        Route::post('/ai/knowledge/delete-group', [AiBotController::class, 'deleteLawByGroup']);
        Route::post('/ai/knowledge/import', [AiBotController::class, 'importLawFile']);
        Route::post('/ai/knowledge', [AiBotController::class, 'storeKnowledge']);
        Route::get('/ai/knowledge', [AiBotController::class, 'getKnowledgeBase']);
        Route::get('/ai/history-logs', [AiBotController::class, 'getAdminChatLogs']);
        Route::put('/ai/knowledge/{id}', [AiBotController::class, 'updateKnowledge']);
        Route::delete('/ai/knowledge/{id}', [AiBotController::class, 'deleteKnowledge']);
        Route::get('/ai/history-logs', [AiBotController::class, 'getAdminChatLogs']);
    });

    /*
    |--------------------------------------------------------------------------
    | Lawyer Routes (Role 2)
    |--------------------------------------------------------------------------
    | Lawyer operations: Profiles, Scheduling, & Client Engagements.
    */
    Route::middleware('role:2')->prefix('lawyer')->group(function () {

        Route::get('/dashboard-stats', [LawyerManagementController::class, 'getDashboardStats']);

        // Profile, Pricing, & Office Management
        Route::put('/profile', [LawyerManagementController::class, 'updateProfile']);
        Route::post('/offices', [LawyerManagementController::class, 'updateOffice']);
        Route::put('/update-price', [LawyerManagementController::class, 'updateServicePrice']);
        Route::post('/change-password', [LawyerManagementController::class, 'changePassword']);

        // Credentials & Verification
        Route::post('/achievements', [LawyerManagementController::class, 'addAchievement']);
        Route::delete('/achievements/{id}', [LawyerManagementController::class, 'deleteAchievement']);
        Route::post('/verify', [LawyerManagementController::class, 'submitVerification']);
        Route::delete('verify/{id}', [LawyerManagementController::class, 'deleteVerification']);

        // Scheduling & Booking Controls
        Route::get('/availability', [AvailabilityController::class, 'index']);
        Route::post('/availability', [AvailabilityController::class, 'store']);
        Route::put('/availability/{id}', [AvailabilityController::class, 'update']);
        Route::delete('/availability/{id}', [AvailabilityController::class, 'destroy']);

        // Appointment Lifecycle
        Route::get('/appointments', [AppointmentController::class, 'index']);
        Route::put('/appointments/{id}', [AppointmentController::class, 'update']);
        Route::get('/appointments/{id}', [AppointmentController::class, 'show']);
        Route::get('/appointments/{id}', [AppointmentController::class, 'getLawyerAppointmentDetail']);
        Route::post('/appointments/{id}/complete', [AppointmentController::class, 'completeAppointment']);

        // Interaction Tools
        Route::post('/community/questions/{id}/answers', [CommunityController::class, 'storeAnswer']);
        Route::get('/community/questions-for-lawyer', [CommunityController::class, 'getQuestionsForLawyer']);
        Route::get('/community/my-answered-questions', [CommunityController::class, 'getMyAnsweredQuestions']);
    });

    /*
    |--------------------------------------------------------------------------
    | Customer Routes (Role 3)
    |--------------------------------------------------------------------------
    | Client services: Profile management, Bookings, & Q&A.
    */
    Route::middleware('role:3')->prefix('customer')->group(function () {

        Route::get('/profile', [CustomerController::class, 'getProfile']);
        Route::put('/profile', [CustomerController::class, 'updateProfile']);

        // Booking & Scheduling
        Route::post('/appointments', [AppointmentController::class, 'store']);
        Route::get('/appointments/{id}', [AppointmentController::class, 'show']);
        Route::get('/lawyers/{lawyerId}/schedule', [BookingScheduleController::class, 'getSchedule']);
        Route::get('/my-appointments/{id}', [AppointmentController::class, 'myAppointments']);
        Route::get('/appointments', [AppointmentController::class, 'myList']);
        Route::put('/appointments/{id}/cancel', [AppointmentController::class, 'cancelByCustomer']);

        // Engagement
        Route::post('/community/questions', [CommunityController::class, 'storeQuestion']);
        Route::post('/reviews', [CommunityController::class, 'storeReview']);
    });

/*
    |--------------------------------------------------------------------------
    | Shared Finance & Payment Services
    |--------------------------------------------------------------------------
    | Common billing endpoints for Lawyers and Customers.
    */
    Route::get('/payment/plans', [PaymentController::class, 'getPlans']);
    Route::post('/payment/subscription', [PaymentController::class, 'buySubscription']);
    Route::get('/payment/current-subscription', [PaymentController::class, 'getCurrentSubscription']);
    Route::post('/payment/preview', [PaymentController::class, 'getPaymentInfo']);
    Route::post('/payment/booking', [PaymentController::class, 'payBooking']);
    Route::get('/payment/history', [PaymentController::class, 'getHistory']);
});
