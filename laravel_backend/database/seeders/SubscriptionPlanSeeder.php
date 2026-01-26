<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('subscription_plans')->insert([
            ['planid' => 1, 'planname' => 'Free', 'price' => 0],
            ['planid' => 2, 'planname' => 'Monthly Pro', 'price' => 100],
            ['planid' => 3, 'planname' => 'Yearly Premium', 'price' => 1100],
        ]);
    }
}
