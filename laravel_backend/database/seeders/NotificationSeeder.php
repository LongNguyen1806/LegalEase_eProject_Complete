<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $userIds = range(2, 13);

        foreach ($userIds as $uid) {
            DB::table('notifications')->insert([
                'userid'      => $uid,
                'message'     => 'Welcome to LegalEase.',
                'type'        => 'System',
                'issentemail' => false,
                'sentat'      => $now,
                'isread'      => false,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }
}