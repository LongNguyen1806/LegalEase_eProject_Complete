<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LawyerEarningSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::table('lawyer_earnings')->insert([
    
            [
                'lawyerid'            => 2,
                'totalmatches'        => 1,
                'totalcommissionpaid' => 200, 
                'created_at'          => $now,
                'updated_at'          => $now,
            ],

            [
                'lawyerid'            => 3,
                'totalmatches'        => 1,
                'totalcommissionpaid' => 200, 
                'created_at'          => $now,
                'updated_at'          => $now,
            ],

            [
                'lawyerid'            => 4,
                'totalmatches'        => 1,
                'totalcommissionpaid' => 200, 
                'created_at'          => $now,
                'updated_at'          => $now,
            ],

            [
                'lawyerid'            => 5,
                'totalmatches'        => 0,
                'totalcommissionpaid' => 0, 
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
        ]);
    }
}