<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SpecializationSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('specializations')->insert([
            ['specid' => 1, 'specname' => 'Civil Law'],
            ['specid' => 2, 'specname' => 'Consumer Protection Law'],
            ['specid' => 3, 'specname' => 'Marriage and Family Law'],
            ['specid' => 4, 'specname' => 'Road Traffic Law'],
            ['specid' => 5, 'specname' => 'Residence Law'],
            ['specid' => 6, 'specname' => 'Civil Status Law'],
            ['specid' => 7, 'specname' => 'Domestic Violence Prevention Law'],
            ['specid' => 8, 'specname' => 'Complaint Law'],
            ['specid' => 9, 'specname' => 'Criminal Law'],
            ['specid' => 10, 'specname' => 'IT and Cybersecurity Law'],
            ['specid' => 11, 'specname' => 'Commercial Law'],
        ]);
    }
}
