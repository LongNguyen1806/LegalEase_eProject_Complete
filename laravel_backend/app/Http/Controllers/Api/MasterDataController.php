<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Specialization;
use App\Models\SubscriptionPlan;

/**
 * Class MasterDataController
 * * Provides global configuration and look-up data used throughout the application.
 * This includes static data such as geographic locations, legal specializations, 
 * and available subscription tier information.
 * * @package App\Http\Controllers\Api
 */
class MasterDataController extends Controller
{
    /**
     * Retrieve a comprehensive set of all system master data.
     * * Returns a combined payload of locations, legal specializations, and 
     * subscription plans to minimize initial load requests from the frontend.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $locations = Location::select('locid', 'cityname')->get();
            $specializations = Specialization::select('specid', 'specname')->get();
            $plans = SubscriptionPlan::select('planid', 'planname', 'price', 'features')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'locations' => $locations,
                    'specializations' => $specializations,
                    'plans' => $plans
                ]
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching system data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fetch all available geographic locations.
     * * Aliases database columns to standard 'id' and 'name' formats 
     * for easier consumption by generic frontend UI components.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getLocations()
    {
        try {

            $locations = Location::select('locid as id', 'cityname as name')->get();
            return response()->json(['success' => true, 'data' => $locations]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Fetch the list of legal specializations supported by the system.
     * * Used for filtering lawyers and setting up lawyer profiles.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSpecializations()
    {
        try {
            $specializations = Specialization::select('specid', 'specname')->get();
            return response()->json(['success' => true, 'data' => $specializations]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
