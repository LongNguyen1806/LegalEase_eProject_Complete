<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        
        $datePast = Carbon::now()->subDays(2)->format('Y-m-d');   
        $dateToday = Carbon::now()->format('Y-m-d');              
        $dateFuture = Carbon::now()->addDays(3)->format('Y-m-d'); 

        $shiftL2_Past = DB::table('availability_slots')->insertGetId([
            'lawyerid'      => 2,
            'availabledate' => $datePast,
            'starttime'     => '08:00:00',
            'endtime'       => '12:00:00',
            'isavailable'   => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $shiftL2_Future = DB::table('availability_slots')->insertGetId([
            'lawyerid'      => 2,
            'availabledate' => $dateFuture,
            'starttime'     => '08:00:00',
            'endtime'       => '17:00:00',
            'isavailable'   => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $shiftL3_Past = DB::table('availability_slots')->insertGetId([
            'lawyerid'      => 3,
            'availabledate' => $datePast,
            'starttime'     => '13:00:00',
            'endtime'       => '17:00:00',
            'isavailable'   => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $shiftL4_Today = DB::table('availability_slots')->insertGetId([
            'lawyerid'      => 4,
            'availabledate' => $dateToday,
            'starttime'     => '08:00:00',
            'endtime'       => '12:00:00',
            'isavailable'   => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

        $shiftL5_Today = DB::table('availability_slots')->insertGetId([
            'lawyerid'      => 5,
            'availabledate' => $dateToday,
            'starttime'     => '13:00:00',
            'endtime'       => '17:00:00',
            'isavailable'   => 1,
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);

             DB::table('appointments')->insert([
            'slotid'         => $shiftL2_Past,
            'customerid'     => 8,
            'lawyerid'       => 2,
            'status'         => 'Completed',
            'packagename'    => 'Legal Analysis',
            'duration'       => 120,
            'starttime'      => '08:00:00',
            'commissionfee'  => 300,
            'note'           => 'I need legal advice on fast-track uncontested divorce procedures.',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);

        DB::table('appointments')->insert([
            'slotid'         => $shiftL3_Past,
            'customerid'     => 9,
            'lawyerid'       => 3,
            'status'         => 'Completed',
            'packagename'    => 'Legal Express', 
            'duration'       => 60,
            'starttime'      => '14:00:00',
            'commissionfee'  => 220,
            'note'           => 'Requesting a lawyer to review this real estate purchase agreement for potential legal risks.',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);

        DB::table('appointments')->insert([
            'slotid'         => $shiftL4_Today,
            'customerid'     => 10,
            'lawyerid'       => 4,
            'status'         => 'Completed',
            'packagename'    => 'Legal Analysis', 
            'duration'       => 120,
            'starttime'      => '09:00:00',
            'commissionfee'  => 300,
            'note'           => 'Consultation regarding family inheritance and property disputes.',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);

        DB::table('appointments')->insert([
            'slotid'         => $shiftL5_Today,
            'customerid'     => 11,
            'lawyerid'       => 5,
            'status'         => 'Pending',
            'packagename'    => 'Legal Express', 
            'duration'       => 60,
            'starttime'      => '13:00:00',
            'commissionfee'  => 180,
            'note'           => 'I would like to learn about the procedures for establishing a single-member limited liability company.',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);

        DB::table('appointments')->insert([
            'slotid'         => $shiftL2_Future,
            'customerid'     => 8,
            'lawyerid'       => 2,
            'status'         => 'Confirmed',
            'packagename'    => 'Legal Express', 
            'duration'       => 60,
            'starttime'      => '10:00:00',
            'commissionfee'  => 150,
            'note'           => 'Follow-up consultation regarding child custody rights after divorce.',
            'created_at'     => $now,
            'updated_at'     => $now,
        ]);
    }
}