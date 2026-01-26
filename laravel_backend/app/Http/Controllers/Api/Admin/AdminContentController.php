<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\ContentManagement;
use App\Models\SystemAuditLog;
use App\Traits\HasAuditLog;

/**
 * Manages content management system (CMS) operations and system audit logs.
 *
 * This controller handles the CRUD operations for various content types
 * (FAQ, News, Guides, etc.), handles inline image uploads for rich text editors,
 * and provides endpoints for retrieving system audit trails.
 */

class AdminContentController extends Controller
{
    use HasAuditLog;

    /**
     * Retrieves a list of content items.
     *
     * Allows filtering by content type (e.g., FAQ, News, Guide).
     * Results are ordered by creation date in descending order.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getContent(Request $request)
    {
        $query = ContentManagement::query();

        if ($request->has('type') && $request->type !== 'All') {
            $query->where('type', $request->type);
        }

        $query->orderBy('created_at', 'desc');

        return response()->json(['success' => true, 'data' => $query->get()]);
    }

    /**
     * Stores a new content item in the database.
     *
     * Validates the input data, handles optional content image uploads to the public disk,
     * and records the creation event in the system audit log.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeContent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type'         => 'required|in:FAQ,Guide,News,Terms of Service,Privacy Policy,Cookie Policy',
            'title'        => 'nullable|string|max:255',
            'body'         => 'required|string',
            'contentimage' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:15360'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $request->only(['type', 'title', 'body']);

            if ($request->hasFile('contentimage')) {
                $file = $request->file('contentimage');
                $filename = $file->hashName();
                $file->storeAs('News', $filename, 'public');
                $data['contentimage'] = $filename;
            }

            $content = ContentManagement::create($data);
            $this->logAction("Created new content: {$content->title} ({$content->type})");

            return response()->json(['success' => true, 'data' => $content], 201);
        } catch (\Exception $e) {
            Log::error("Store Content Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Upload failed'], 500);
        }
    }

    /**
     * Updates an existing content item.
     *
     * Handles validation and optional image replacement. If a new image is provided,
     * the old image is securely removed from storage. The update action is recorded in the audit log.
     *
     * @param Request $request
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateContent(Request $request, $id)
    {
        $content = ContentManagement::findOrFail($id);
        $validator = Validator::make($request->all(), [
            'type'         => 'required|in:FAQ,Guide,News,Terms of Service,Privacy Policy,Cookie Policy',
            'title'        => 'nullable|string|max:255',
            'body'         => 'required|string',
            'contentimage' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:15360'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $request->only(['type', 'title', 'body']);

            if ($request->hasFile('contentimage')) {
                if ($content->contentimage && Storage::disk('public')->exists('News/' . $content->contentimage)) {
                    Storage::disk('public')->delete('News/' . $content->contentimage);
                }

                $file = $request->file('contentimage');
                $filename = $file->hashName();
                $file->storeAs('News', $filename, 'public');
                $data['contentimage'] = $filename;
            }

            $content->update($data);
            $this->logAction("Updated content ID: {$id}");

            return response()->json(['success' => true, 'data' => $content]);
        } catch (\Exception $e) {
            Log::error("Update Content Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Update failed'], 500);
        }
    }

    /**
     * Permanently deletes a content item.
     *
     * Removes the associated image file from storage (if it exists) and deletes the record
     * from the database. The deletion is recorded in the audit log.
     *
     * @param mixed $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteContent($id)
    {
        $content = ContentManagement::findOrFail($id);

        if ($content->contentimage && Storage::disk('public')->exists('News/' . $content->contentimage)) {
            Storage::disk('public')->delete('News/' . $content->contentimage);
        }

        $content->delete();
        $this->logAction("Deleted content ID: {$id}");

        return response()->json(['success' => true, 'message' => 'Content deleted']);
    }

    /**
     * Handles inline image uploads for rich text editors (e.g., CKEditor).
     *
     * Validates and stores the uploaded image, returning the public URL in a JSON format
     * compatible with WYSIWYG editor requirements.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function uploadInlineImage(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'upload' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:15240',
        ]);

        if ($validator->fails()) {
            return response()->json(['uploaded' => false, 'error' => ['message' => 'Invalid image format']], 422);
        }

        try {
            if ($request->hasFile('upload')) {
                $file = $request->file('upload');
                $filename = $file->hashName();
                $file->storeAs('News', $filename, 'public');
                $url = asset('storage/News/' . $filename);
                return response()->json([
                    'url' => $url,
                    'uploaded' => true
                ]);
            }
        } catch (\Exception $e) {
            return response()->json(['uploaded' => false, 'error' => ['message' => 'Upload failed']], 500);
        }
    }

    /**
     * Retrieves the latest system audit logs.
     *
     * Fetches the most recent 50 logs, eager loading the associated admin user details,
     * ordered by timestamp.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAuditLogs()
    {
        $logs = SystemAuditLog::with('admin:userid,email')
            ->orderBy('timestamp', 'desc')
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'data' => $logs]);
    }
}
