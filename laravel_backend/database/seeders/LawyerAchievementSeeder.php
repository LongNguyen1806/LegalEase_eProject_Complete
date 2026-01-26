<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LawyerAchievementSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $lawyerIds = range(2, 7);

        foreach ($lawyerIds as $lawyerId) {
            DB::table('lawyer_achievements')->insert([
                'lawyerid'   => $lawyerId,
                'title'      => 'Outstanding Lawyer of the Year 2025',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
