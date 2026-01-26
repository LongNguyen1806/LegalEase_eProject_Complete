<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PaymentInvoiceSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        DB::table('payments_invoices')->insert([

            [
                'userid'        => 2,
                'appointid'     => null,
                'subid'         => 1,
                'transactionno' => 'SUB-YEAR-002',
                'paymentmethod' => 'Credit Card',
                'amount'        => 1100,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subDays(5),
                'created_at'    => $now,
                'updated_at' => $now,
            ],
            [
                'userid'        => 6,
                'appointid'     => null,
                'subid'         => 5,
                'transactionno' => 'SUB-MONTH-006',
                'paymentmethod' => 'ATM',
                'amount'        => 100,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subDays(2),
                'created_at'    => $now,
                'updated_at' => $now,
            ],

            [
                'userid'        => 8,
                'appointid'     => 1,
                'subid'         => null,
                'transactionno' => 'BOOK-VNP-001',
                'paymentmethod' => 'E-Wallet',
                'amount'        => 200,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subDays(2),
                'created_at'    => $now,
                'updated_at' => $now,
            ],

            [
                'userid'        => 9,
                'appointid'     => 2,
                'subid'         => null,
                'transactionno' => 'BOOK-CC-002',
                'paymentmethod' => 'Credit Card',
                'amount'        => 200,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subDays(2),
                'created_at'    => $now,
                'updated_at' => $now,
            ],

            [
                'userid'        => 10,
                'appointid'     => 3,
                'subid'         => null,
                'transactionno' => 'BOOK-MOMO-003',
                'paymentmethod' => 'Momo',
                'amount'        => 200,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subHours(12),
                'created_at'    => $now,
                'updated_at' => $now,
            ],

            [
                'userid'        => 11,
                'appointid'     => 4,
                'subid'         => null,
                'transactionno' => 'BOOK-ATM-004',
                'paymentmethod' => 'ATM',
                'amount'        => 200,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subHours(5),
                'created_at'    => $now,
                'updated_at' => $now,
            ],

            [
                'userid'        => 8,
                'appointid'     => 5,
                'subid'         => null,
                'transactionno' => 'BOOK-ZALO-005',
                'paymentmethod' => 'ZaloPay',
                'amount'        => 200,
                'refundamount'  => 0,
                'status'        => 'Success',
                'createdat'     => $now->copy()->subHours(1),
                'created_at'    => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
