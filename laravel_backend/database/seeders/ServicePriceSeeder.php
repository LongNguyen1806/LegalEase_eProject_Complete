<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServicePriceSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::table('service_price_ranges')->insert([
            [
                'specid'     => 1, 
                'minprice'   => 200,
                'maxprice'   => 300,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 2, 
                'minprice'   => 300,
                'maxprice'   => 400,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 3, 
                'minprice'   => 300,
                'maxprice'   => 600,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 4, 
                'minprice'   => 400,
                'maxprice'   => 700,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 5, 
                'minprice'   => 380,
                'maxprice'   => 500,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 6,
                'minprice'   => 600,
                'maxprice'   => 1200,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'     => 7, 
                'minprice'   => 700,
                'maxprice'   => 900,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'specid'      => 8, 
                'minprice'    => 500,
                'maxprice'    => 1000,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'specid'      => 9,
                'minprice'    => 100,
                'maxprice'    => 200,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'specid'      => 10, 
                'minprice'    => 800,
                'maxprice'    => 1500,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'specid'      => 11, 
                'minprice'    => 600,
                'maxprice'    => 1200,
                'created_at'  => $now,
                'updated_at'  => $now,
            ],

        ]);
    }
}
