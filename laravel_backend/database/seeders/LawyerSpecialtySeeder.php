<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LawyerSpecialtySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $lawyerIds = range(2, 7);

        foreach ($lawyerIds as $lawyerId) {
            DB::table('lawyer_specialties')->insert([
                [
                    'lawyerid'   => $lawyerId,
                    'specid'     => 2,
                    'created_at'=> $now,
                    'updated_at'=> $now,
                ],
                [
                    'lawyerid'   => $lawyerId,
                    'specid'     => 4,
                    'created_at'=> $now,
                    'updated_at'=> $now,
                ],
            ]);
        }
    }
}
