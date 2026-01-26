<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('locations')->insert([
            ['locid' => 1, 'cityname' => 'District 1, Ho Chi Minh City'],
            ['locid' => 2, 'cityname' => 'District 2, Ho Chi Minh City'],
            ['locid' => 3, 'cityname' => 'District 3, Ho Chi Minh City'],
            ['locid' => 4, 'cityname' => 'District 4, Ho Chi Minh City'],
            ['locid' => 5, 'cityname' => 'District 5, Ho Chi Minh City'],
            ['locid' => 6, 'cityname' => 'District 6, Ho Chi Minh City'],
            ['locid' => 7, 'cityname' => 'District 7, Ho Chi Minh City'],
            ['locid' => 8, 'cityname' => 'District 8, Ho Chi Minh City'],
            ['locid' => 9, 'cityname' => 'District 9, Ho Chi Minh City'],
            ['locid' => 10, 'cityname' => 'District 10, Ho Chi Minh City'],
            ['locid' => 11, 'cityname' => 'District 11, Ho Chi Minh City'],
            ['locid' => 12, 'cityname' => 'District 12, Ho Chi Minh City'],
            ['locid' => 13, 'cityname' => 'Phu Nhuan District, Ho Chi Minh City'],
            ['locid' => 14, 'cityname' => 'Tan Binh District, Ho Chi Minh City'],
            ['locid' => 15, 'cityname' => 'Go Vap District, Ho Chi Minh City'],
            ['locid' => 16, 'cityname' => 'Tan Phu District, Ho Chi Minh City'],
            ['locid' => 17, 'cityname' => 'Binh Thanh District, Ho Chi Minh City'],
            ['locid' => 18, 'cityname' => 'Thu Duc City']
            
        ]);
    }
}