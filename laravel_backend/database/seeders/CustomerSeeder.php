<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        foreach (range(8, 13) as $i => $id) {
            DB::table('customer_profiles')->insert([
                'customerid' => $id,
                'fullname' => 'Customer ' . ($i + 1),
                'phonenumber' => '091000000' . ($i + 1),
            ]);
        }
    }
}
