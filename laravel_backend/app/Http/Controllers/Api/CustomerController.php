<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\CustomerProfile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;

/**
 * Customer Controller
 *
 * Manages customer profile retrieval and updates.
 */
class CustomerController extends Controller
{
    /**
     * Get current customer profile
     *
     * Returns the authenticated customer's profile data.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProfile()
    {
        $user = Auth::user();

        if ($user->roleid != 3) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $profile = CustomerProfile::where('customerid', $user->userid)->first();

        if (!$profile) {
            return response()->json(['message' => 'Profile not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $profile
        ]);
    }

    /**
     * Update customer profile
     *
     * Updates profile fields and optionally updates password and avatar.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->roleid != 3) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'fullname'         => 'required|string|max:100',
            'phonenumber'      => 'nullable|string|max:20',
            'profileimage'     => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10048',
            'current_password' => 'required_with:new_password',
            'new_password'     => 'nullable|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->filled('new_password')) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Current password is incorrect.'
                ], 400);
            }

            $user->update([
                'password' => $request->new_password
            ]);
        }

        $profile = CustomerProfile::where('customerid', $user->userid)->first();

        $updateData = [
            'fullname'    => $request->fullname,
            'phonenumber' => $request->phonenumber,
        ];

        if ($request->hasFile('profileimage')) {
            if ($profile && $profile->profileimage) {
                Storage::disk('public')->delete($profile->profileimage);
            }

            $file = $request->file('profileimage');
            $filename = time() . '_' . $user->userid . '_customer.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('customer_avatars', $filename, 'public');
            $updateData['profileimage'] = $path;
        }

        if ($profile) {
            $profile->update($updateData);
        } else {
            $updateData['customerid'] = $user->userid;
            $profile = CustomerProfile::create($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data'    => $profile
        ]);
    }
}
