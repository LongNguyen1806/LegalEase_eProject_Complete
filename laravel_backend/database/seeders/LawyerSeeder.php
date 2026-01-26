<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LawyerSeeder extends Seeder
{
    public function run(): void
    {
        $lawyerIds = range(2, 7);

        $lawyerNames = [
            'Andrew Nguyen',
            'Beatrice Tran',
            'Cedric Le',
            'Dominic Pham',
            'Harrison Hoang',
            'Hubert Truong',
        ];

        $offices = [
            ['loc' => 1, 'lat' => 10.771111, 'lng' => 106.693389, 'addr' => '36 Nguyen Thi Nghia St, Dist 1'],
            ['loc' => 5, 'lat' => 10.757361, 'lng' => 106.673778, 'addr' => '01 An Duong Vuong St, Dist 5'],
            ['loc' => 7, 'lat' => 10.726250, 'lng' => 106.708806, 'addr' => '101 Nguyen Duc Canh St, Dist 7'],
            ['loc' => 13, 'lat' => 10.793250, 'lng' => 106.669972, 'addr' => '188A Le Van Sy St, Phu Nhuan Dist'],
            ['loc' => 15, 'lat' => 10.843139, 'lng' => 106.642139, 'addr' => '1180 Quang Trung St, Go Vap Dist'],
            ['loc' => 1, 'lat' => 10.763665, 'lng' => 106.660194, 'addr' => '140 Ly Thuong Kiet St, Dist 10'],
        ];

        foreach ($lawyerIds as $i => $lawyerId) {
            $pending = $i === 5;

            DB::table('lawyer_profiles')->insert([
                'lawyerid' => $lawyerId,
                'fullname' => $lawyerNames[$i],
                'phonenumber' => '098000000' . ($i + 1),
                'experienceyears' => 5 + $i,
                'bio' => "Hello, I am Attorney {$lawyerNames[$i]}, specializing in providing comprehensive legal solutions.",
                'isverified' => $pending ? 0 : 1,
            ]);

            DB::table('lawyer_offices')->insert([
                'lawyerid' => $lawyerId,
                'locid' => $offices[$i]['loc'],
                'latitude' => $offices[$i]['lat'],
                'longitude' => $offices[$i]['lng'],
                'addressdetail' => $offices[$i]['addr'],
            ]);
        }
    }
}