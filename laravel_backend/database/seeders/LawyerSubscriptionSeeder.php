<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LawyerSubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        
        DB::table('lawyer_subscriptions')->insert([
            [
                'lawyerid'   => 2,
                'planid'     => 3, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addYear(), 
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lawyerid'   => 3,
                'planid'     => 3, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addYear(),
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lawyerid'   => 4,
                'planid'     => 3, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addYear(),
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lawyerid'   => 5,
                'planid'     => 3, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addYear(),
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],

            [
                'lawyerid'   => 6,
                'planid'     => 2, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addMonth(), 
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lawyerid'   => 7,
                'planid'     => 2, 
                'startdate'  => $now,
                'enddate'    => Carbon::now()->addMonth(),
                'status'     => 'Active',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
