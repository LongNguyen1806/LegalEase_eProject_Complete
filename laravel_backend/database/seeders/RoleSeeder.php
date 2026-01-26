<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('roles')->insert([
            ['roleid' => 1, 'rolename' => 'admin'],
            ['roleid' => 2, 'rolename' => 'lawyer'],
            ['roleid' => 3, 'rolename' => 'customer'],
        ]);
    }
}
