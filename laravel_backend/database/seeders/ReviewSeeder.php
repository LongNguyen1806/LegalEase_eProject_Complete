<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $appointments = DB::table('appointments')->get();

        $titles = [
            'Very satisfied with the service',
            'Dedicated lawyer',
            'Exceeded expectations',
        ];

        $comments = [
            'The lawyer provided clear and very professional advice.',
            'Serious work ethic and fast resolution.',
            'I am completely satisfied with the results achieved.',
        ];

        foreach ($appointments as $i => $appt) {
            DB::table('reviews')->insert([
                'appointid' => $appt->appointid,
                'rating' => 5,
                'title' => $titles[$i % 3],
                'relationship' => $i % 2 === 0 ? 'consulted' : 'hired',
                'comment' => $comments[$i % 3],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}