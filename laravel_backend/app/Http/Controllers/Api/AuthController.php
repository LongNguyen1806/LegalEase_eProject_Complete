<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LawyerProfile;
use App\Models\CustomerProfile;
use Illuminate\Support\Facades\Storage;
use App\Models\LawyerVerification;
use App\Models\LawyerOffice;
use Illuminate\Support\Facades\DB; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

/**
 * Authentication Controller
 * 
 * Handles user authentication and registration operations for the LegalEase platform.
 * Supports registration for both lawyers and customers, login, user information retrieval,
 * and logout functionality. Manages user profiles, verification documents, and access tokens.
 */
class AuthController extends Controller
{
    /**
     * Register a new user
     * 
     * Registers a new user account (lawyer or customer) with validation and profile creation.
     * For lawyers, creates lawyer profile, verification documents, office information,
     * specializations, and achievements. For customers, creates a basic customer profile.
     * 
     * Lawyer registration requires:
     * - Phone number, experience years, license number, ID card number
     * - Verification documents (images/PDFs)
     * - Location and address details
     * - Specializations
     * - Optional profile image and achievements
     * 
     * Customer registration requires basic information only.
     * 
     * @param \Illuminate\Http\Request $request Request containing user registration data
     *                                          Required fields: email, password, fullname, roleid, terms
     *                                          Additional fields for lawyers: phonenumber, experienceyears,
     *                                          licensenumber, idcardnumber, documentimages, locid, 
     *                                          addressdetail, specids
     * 
     * @return \Illuminate\Http\JsonResponse JSON response with registration status and user data
     *                                       Returns 201 on success, 422 on validation error, 500 on failure
     */
    public function register(Request $request)
    {
        $rules = [
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'fullname' => 'required|string|max:100',
            'roleid'   => 'required|in:2,3',
            'terms'    => 'accepted',
        ];

        if ((int)$request->roleid === 2) {
            $rules = array_merge($rules, [
                'phonenumber'     => 'required|regex:/^[0-9]{10,11}$/|unique:lawyer_profiles,phonenumber',
                'experienceyears' => 'required|integer|min:0',
                'licensenumber'    => 'required|string|max:50|unique:lawyer_verifications,licensenumber',
                'idcardnumber'     => 'required|string|max:20|unique:lawyer_verifications,idcardnumber',
                'documentimages'   => 'required|array|min:1',
                'documentimages.*' => 'mimes:jpeg,png,jpg,pdf|max:15120',
                'locid'           => 'required|exists:locations,locid',
                'addressdetail'   => 'required|string|max:255',
                'profileimage'    => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'specids'         => 'required|array',
                'specids.*'       => 'exists:specializations,specid',
                'achievements'    => 'nullable|array',
                'achievements.*'  => 'string|max:255',
            ]);
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();

        $uploadedFiles = [];

        try {
            $isActive = (int)$request->roleid === 3;
            $user = User::create([
                'email'    => $request->email,
                'password' => $request->password,
                'roleid'   => $request->roleid,
                'isactive' => $isActive,
            ]);

            if ((int)$user->roleid === 2) {

                $avatarPath = null;
                if ($request->hasFile('profileimage')) {
                    $file = $request->file('profileimage');
                    $filename = time() . '_' . $user->userid . '_avatar.' . $file->getClientOriginalExtension();
                    $avatarPath = $file->storeAs('lawyer_avatars', $filename, 'public');
                    $uploadedFiles[] = 'lawyer_avatars/' . $filename;
                }

                LawyerProfile::create([
                    'lawyerid'        => $user->userid,
                    'fullname'        => $request->fullname,
                    'phonenumber'     => $request->phonenumber,
                    'experienceyears' => $request->experienceyears,
                    'bio'             => $request->bio ?? null,
                    'profileimage'    => $avatarPath,
                    'isverified'      => false,
                    'ispro'           => false,
                ]);

                if ($request->hasFile('documentimages')) {
                    $docPaths = [];
                    foreach ($request->file('documentimages') as $index => $file) {
                        $filename = time() . '_' . $user->userid . '_verify_' . $index . '.' . $file->getClientOriginalExtension();
                        $path = $file->storeAs('verifications', $filename, 'public');

                        $uploadedFiles[] = 'verifications/' . $filename;
                        $docPaths[] = $path; 
                    }

                    LawyerVerification::create([
                        'lawyerid'      => $user->userid,
                        'idcardnumber'  => $request->idcardnumber,
                        'licensenumber' => $request->licensenumber,
                        'documentimage' => json_encode($docPaths),
                        'status'        => 'pending'
                    ]);
                }

                LawyerOffice::create([
                    'lawyerid'      => $user->userid,
                    'locid'         => $request->locid,
                    'addressdetail' => $request->addressdetail,
                ]);

                if ($request->has('specids')) {
                    $specData = [];
                    foreach ($request->specids as $specId) {
                        $specData[] = [
                            'lawyerid' => $user->userid,
                            'specid'   => $specId
                        ];
                    }
                    DB::table('lawyer_specialties')->insert($specData);
                }

                if ($request->has('achievements')) {
                    $achData = [];
                    foreach ($request->achievements as $title) {
                        if (!empty($title)) { 
                            $achData[] = [
                                'lawyerid' => $user->userid,
                                'title'    => $title,
                            ];
                        }
                    }
                    if (!empty($achData)) {
                        DB::table('lawyer_achievements')->insert($achData);
                    }
                }
            } else {
               
                CustomerProfile::create([
                    'customerid'  => $user->userid,
                    'fullname'    => $request->fullname,
                    'phonenumber' => $request->phonenumber ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => (int)$user->roleid === 2
                    ? 'Registration successful. Your account is pending approval.'
                    : 'Registration successful.',
                'user'    => $user
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            foreach ($uploadedFiles as $filePath) {
                Storage::disk('public')->delete($filePath);
            }

            return response()->json([
                'message' => 'Registration failed',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Authenticate user and generate access token
     * 
     * Authenticates a user with email and password credentials. Upon successful authentication,
     * generates a Bearer token for API access and loads the appropriate profile (lawyer or customer).
     * Checks if the account is active before allowing login.
     * 
     * @param \Illuminate\Http\Request $request Request containing email and password credentials
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing access token and user information
     *                                       Returns 200 on success, 401 on invalid credentials, 
     *                                       403 if account is deactivated
     */
    public function login(Request $request)
    {
        $credentials = [
            'email'    => $request->email,
            'password' => $request->password
        ];

        if (Auth::attempt($credentials)) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            if (!$user->isactive) {
                return response()->json(['message' => 'Your account has been deactivated'], 403);
            }

            if ($user->roleid == 2) {
                $user->load('lawyerProfile');
            } elseif ($user->roleid == 3) {
                $user->load('customerProfile');
            }

            $token = $user->createToken('LegalEaseAuthToken')->plainTextToken;

            return response()->json([
                'message'      => 'Login successful',
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => $user,
            ]);
        }

        return response()->json(['message' => 'invalid email or password'], 401);
    }

    /**
     * Get authenticated user information
     * 
     * Retrieves the currently authenticated user's information along with their associated
     * profile data. Loads role information and appropriate profile (lawyer or customer)
     * based on the user's role ID.
     * 
     * @param \Illuminate\Http\Request $request Request object (must include authenticated user via token)
     * 
     * @return \Illuminate\Http\JsonResponse JSON response containing user information with loaded relationships
     */
    public function getUserInfo(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();


        if ($user->roleid == 1) {
            $user->load('role');
        } elseif ($user->roleid == 2) {
            $user->load(['role', 'lawyerProfile']);
        } elseif ($user->roleid == 3) {
            $user->load(['role', 'customerProfile']);
        }

        return response()->json($user);
    }

    /**
     * Logout authenticated user
     * 
     * Revokes the current access token for the authenticated user, effectively logging them out.
     * The token will no longer be valid for subsequent API requests.
     * 
     * @param \Illuminate\Http\Request $request Request object (must include authenticated user via token)
     * 
     * @return \Illuminate\Http\JsonResponse JSON response confirming successful logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout successful']);
    }
}
