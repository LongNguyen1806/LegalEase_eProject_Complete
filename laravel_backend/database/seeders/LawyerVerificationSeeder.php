<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LawyerVerificationSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $lawyerIds = range(2, 7);

        foreach ($lawyerIds as $lawyerId) {
            DB::table('lawyer_verifications')->insert([
                'lawyerid'      => $lawyerId,
                'idcardnumber'  => '0010900000' . $lawyerId,
                'licensenumber' => 'LAW-202' . $lawyerId,
                'documentimage' => 'default_license.jpg',
                'status'        => 'Approved',
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);
        }
    }
}
