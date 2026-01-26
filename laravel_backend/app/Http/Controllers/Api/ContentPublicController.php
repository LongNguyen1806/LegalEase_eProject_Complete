<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ContentManagement;

/**
 * Public Content Controller
 *
 * Serves public content listings and details with optional filtering.
 */
class ContentPublicController extends Controller
{
    /**
     * List public content
     *
     * Supports optional keyword search, type filtering, and limit/pagination.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = ContentManagement::query();

        if ($request->filled('keyword')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->keyword . '%')
                    ->orWhere('body', 'like', '%' . $request->keyword . '%');
            });
        }

        if ($request->filled('type') && $request->type != 'All') {
            $type = $request->type === 'news' ? 'News' : $request->type;
            $query->where('type', $type);
        }

        $query->orderBy('created_at', 'desc');

        if ($request->has('limit')) {
            $limit = (int) $request->input('limit');
            $data = $query->take($limit)->get();
        } else {
            $data = $query->paginate(10);
        }

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Show public content detail
     *
     * Returns a single content item by ID.
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $content = ContentManagement::find($id);
        if (!$content) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $content]);
    }
}
