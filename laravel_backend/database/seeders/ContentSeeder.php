<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ContentSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        DB::table('content_management')->insert([
            [
                'type'       => 'FAQ',
                'title'      => 'How do I book an appointment?',
                'body'       => 'You need to log in to your customer account and select an available time slot from the lawyer\'s schedule.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'type'       => 'News',
                'title'      => 'LegalEase launches lawyer connection platform',
                'body'       => 'LegalEase helps clients find the right lawyer quickly and efficiently.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'type'       => 'Terms of Service',
                'title'      => 'Privacy Policy',
                'body'       => 'We are committed to protecting the personal data and privacy of our users.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}