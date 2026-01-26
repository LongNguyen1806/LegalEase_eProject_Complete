<?php

namespace Database\Seeders;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            LocationSeeder::class,
            SpecializationSeeder::class,
            SubscriptionPlanSeeder::class,
            UserSeeder::class,
            LawyerSeeder::class,
            CustomerSeeder::class,
            AppointmentSeeder::class,
            ReviewSeeder::class,
            QASeeder::class,
            ContentSeeder::class,
            ServicePriceSeeder::class,
            LawyerAchievementSeeder::class,
            LawyerEarningSeeder::class,
            LawyerSpecialtySeeder::class,
            LawyerSubscriptionSeeder::class,
            LawyerVerificationSeeder::class,
            NotificationSeeder::class,
            PaymentInvoiceSeeder::class,
        ]);
    }
}
