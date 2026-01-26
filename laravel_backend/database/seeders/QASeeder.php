<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class QASeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $customerIds = range(8, 13);
        $lawyerIds   = range(2, 7);

        $questionIds = [];

        foreach ($customerIds as $custId) {
            $questionIds[] = DB::table('qa_questions')->insertGetId([
                'customerid' => $custId,
                'title'      => 'Child Custody in Vietnam',
                'content'    => 'How is child custody decided in Vietnam?',
                'isapproved' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ($questionIds as $i => $qid) {
            DB::table('qa_answers')->insert([
                'questionid' => $qid,
                'lawyerid'   => $lawyerIds[$i % count($lawyerIds)],
                'content'    => 'The court evaluates the child’s best interests by considering factors such as the child’s age, current living conditions, emotional stability, and each parent’s ability to provide proper care and support.',
                'isapproved' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
