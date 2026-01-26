<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Class LawyerPublicController
 * * Provides public-facing endpoints for discovering lawyers.
 * Includes advanced ranking algorithms, searching, filtering, and detailed profile retrieval.
 * * @package App\Http\Controllers\Api
 */
class LawyerPublicController extends Controller
{
    /**
     * Build the base query for lawyers with a calculated ranking score.
     * * The score is calculated based on:
     * - Pro/Subscription status: +50 points
     * - Verification status: +20 points
     * - Average Rating: +5 points per star
     * - Experience: +1 point per year (capped at 20 years)
     * * @return \Illuminate\Database\Eloquent\Builder
     */
    private function getScoredLawyerQuery()
    {
        $reviewSubquery = DB::table('reviews')
            ->join('appointments', 'reviews.appointid', '=', 'appointments.appointid')
            ->select('appointments.lawyerid', DB::raw('AVG(rating) as avg_rating'))
            ->groupBy('appointments.lawyerid');

        $subqueryLatestSub = DB::table('lawyer_subscriptions')
            ->select('lawyerid', 'planid', 'status', 'enddate')
            ->where('status', 'Active')
            ->whereDate('enddate', '>=', now())
            ->whereIn('subid', function ($q) {
                $q->select(DB::raw('MAX(subid)'))->from('lawyer_subscriptions')->groupBy('lawyerid');
            });

        return User::query()
            ->where('users.roleid', 2)
            ->where('users.isactive', true)
            ->leftJoin('lawyer_profiles as lp', 'users.userid', '=', 'lp.lawyerid')
            ->leftJoinSub($reviewSubquery, 'ratings', function ($join) {
                $join->on('users.userid', '=', 'ratings.lawyerid');
            })

            ->leftJoinSub($subqueryLatestSub, 'active_subs', function ($join) {
                $join->on('users.userid', '=', 'active_subs.lawyerid');
            })
            ->leftJoin('subscription_plans as sp', 'active_subs.planid', '=', 'sp.planid')
            ->select(
                'users.userid',
                'users.email',
                'users.created_at',
                'lp.fullname',
                'lp.experienceyears',
                'lp.bio',
                'lp.profileimage',
                'lp.isverified',
                'lp.ispro',
                'sp.planname',
                DB::raw('COALESCE(ratings.avg_rating, 0) as average_rating'),

                DB::raw(' (
                    (CASE WHEN lp.ispro = 1 OR sp.planname IS NOT NULL THEN 50 ELSE 0 END) + 
                    (CASE WHEN lp.isverified = 1 THEN 20 ELSE 0 END) + 
                    (COALESCE(ratings.avg_rating, 0) * 5) + 
                    (LEAST(COALESCE(lp.experienceyears, 0), 20) * 1)
                ) as total_score')
            );
    }

    /**
     * Display a paginated list of lawyers with optional filtering.
     * * Supports filtering by keyword (name, bio, specialization, city), 
     * location ID, and specialization ID. Results are ordered by the total_score.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = $this->getScoredLawyerQuery();

            if ($keyword = $request->input('keyword')) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('lp.fullname', 'like', "%{$keyword}%")
                        ->orWhere('lp.bio', 'like', "%{$keyword}%")
                        ->orWhereHas('specializations', function ($sq) use ($keyword) {
                            $sq->where('specname', 'like', "%{$keyword}%");
                        })
                        ->orWhereHas('office.location', function ($sq) use ($keyword) {
                            $sq->where('cityname', 'like', "%{$keyword}%");
                        });
                });
            }

            if ($locationId = $request->input('location_id')) {
                $query->whereHas('office', function ($q) use ($locationId) {
                    $q->where('locid', $locationId);
                });
            }

            if ($specializationId = $request->input('specialization_id')) {
                $query->whereHas('specializations', function ($q) use ($specializationId) {
                    $q->where('specializations.specid', $specializationId);
                });
            }

            $lawyers = $query->with(['specializations', 'office.location', 'reviews'])
                ->orderBy('total_score', 'desc')
                ->orderBy('users.created_at', 'asc')
                ->paginate(10);

            return response()->json(['success' => true, 'data' => $lawyers], 200);
        } catch (\Throwable $e) {
            Log::error('Lawyer Index Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    /**
     * Retrieve full details for a specific lawyer.
     * * Loads profile, specializations, office location, achievements, 
     * verifications, reviews, and upcoming availability slots.
     *
     * @param  int  $id The User ID of the lawyer
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        try {
            $lawyer = User::where('roleid', 2)
                ->where('userid', $id)
                ->where('isactive', true)
                ->with([
                    'lawyerProfile',
                    'specializations',
                    'office.location',
                    'achievements',
                    'verifications',
                    'reviews.appointment.customer',
                    'availabilitySlots' => function ($query) {
                        $query->where('availabledate', '>=', Carbon::today()->toDateString())
                            ->orderBy('availabledate', 'asc')
                            ->orderBy('starttime', 'asc');
                    }
                ])
                ->first();

            if (!$lawyer) {
                return response()->json(['success' => false, 'message' => 'Lawyer not found.'], 404);
            }

            $averageRating = $lawyer->reviews->avg('rating') ?? 0;
            $lawyer->setAttribute('average_rating', round($averageRating, 1));

            $firstSpec = $lawyer->specializations->first();
            $lawyer->setAttribute('min_price', $firstSpec ? $firstSpec->pivot->specminprice : 0);
            $lawyer->setAttribute('max_price', $firstSpec ? $firstSpec->pivot->specmaxprice : 0);
            $latestVerification = $lawyer->verifications->sortByDesc('id')->first();
            $lawyer->setAttribute('current_verification_status', $latestVerification ? $latestVerification->status : 'unverified');

            return response()->json(['success' => true, 'data' => $lawyer], 200);
        } catch (\Throwable $e) {
            Log::error('Lawyer Detail Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    /**
     * Fetch the top 3 featured lawyers based on the ranking score.
     * * Useful for homepage "Top Rated" or "Featured" sections.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getFeaturedLawyers()
    {
        try {
            $featured = $this->getScoredLawyerQuery()
                ->with(['specializations', 'office.location'])
                ->orderBy('total_score', 'desc')
                ->orderBy('users.created_at', 'asc')
                ->limit(3)
                ->get();

            return response()->json(['success' => true, 'data' => $featured]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Retrieve paginated reviews for a specific lawyer.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id The User ID of the lawyer
     * @return \Illuminate\Http\JsonResponse
     */
    public function getReviews(Request $request, $id)
    {
        try {
            $reviews = Review::whereHas('appointment', function ($q) use ($id) {
                $q->where('lawyerid', $id);
            })
                ->with(['reviews.appointment.customer'])
                ->latest()
                ->paginate(5);

            return response()->json(['success' => true, 'data' => $reviews], 200);
        } catch (\Throwable $e) {
            Log::error('Lawyer Reviews Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }
}
