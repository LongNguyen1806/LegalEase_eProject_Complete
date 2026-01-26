<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $password = Hash::make('legalease123'); 

        DB::table('users')->insert([
        
            [
                'userid'     => 1,
                'email'      => 'admin@legalease.vn',
                'password'   => $password,
                'roleid'     => 1,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],

            [
                'userid'     => 2,
                'email'      => 'lawyer1@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 3,
                'email'      => 'lawyer2@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 4,
                'email'      => 'lawyer3@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 5,
                'email'      => 'lawyer4@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 6,
                'email'      => 'lawyer5@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 7,
                'email'      => 'lawyer6@example.com',
                'password'   => $password,
                'roleid'     => 2,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],

            [
                'userid'     => 8,
                'email'      => 'customer1@example.com',
                'password'   => $password,
                'roleid'     => 3, 
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 9,
                'email'      => 'customer2@example.com',
                'password'   => $password,
                'roleid'     => 3,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 10,
                'email'      => 'customer3@example.com',
                'password'   => $password,
                'roleid'     => 3,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 11,
                'email'      => 'customer4@example.com',
                'password'   => $password,
                'roleid'     => 3,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 12,
                'email'      => 'customer5@example.com',
                'password'   => $password,
                'roleid'     => 3,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'userid'     => 13,
                'email'      => 'customer6@example.com',
                'password'   => $password,
                'roleid'     => 3,
                'isactive'   => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}