<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  mixed  ...$roles  Allowed roles (e.g., 1, 2, 3)
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {

        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = Auth::user();

        if (!$user->isactive) {
            return response()->json([
                'success' => false,
                'message' => 'This account is inactive. Please contact the administrator.'
            ], 403);
        }

        if (!in_array($user->roleid, $roles)) {
            return response()->json(['message' => 'Unauthorized. You do not have permission.'], 403);
        }

        return $next($request);
    }
}
