<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\QaQuestion;
use App\Models\QaAnswer;
use App\Traits\HasNotifications;

/**
 * Community Controller
 *
 * Provides Q&A community features: browsing questions, posting questions/answers,
 * admin approval workflows, and customer reviews.
 */
class CommunityController extends Controller
{
    use HasNotifications;

    /**
     * List approved questions (public)
     *
     * Supports keyword search and returns paginated questions with up to 3 approved answers.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = QaQuestion::where('isapproved', true)
            ->with(['customer.customerProfile', 'answers' => function ($q) {
                $q->where('isapproved', true)
                    ->with('lawyer.lawyerProfile')
                    ->take(3);
            }]);

        if ($request->filled('keyword')) {
            $kw = $request->keyword;
            $query->where(function ($q) use ($kw) {
                $q->where('title', 'like', '%' . $kw . '%')
                    ->orWhere('content', 'like', '%' . $kw . '%');
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->paginate(10)
        ]);
    }

    /**
     * Show a single approved question (public)
     *
     * Loads approved answers with lawyer profiles.
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $question = QaQuestion::where('isapproved', true)
            ->where('questionid', $id)
            ->with(['customer', 'answers' => function ($q) {
                $q->where('isapproved', true)->with('lawyer.lawyerProfile');
            }])
            ->first();

        if (!$question) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $question]);
    }

    /**
     * Create a question (customer)
     *
     * Creates a new question as pending approval.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeQuestion(Request $request)
    {
        $user = Auth::user();

        if ($user->roleid != 3) {
            return response()->json(['message' => 'Only customers.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title'   => 'required|string|max:255',
            'content' => 'required|string|min:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $question = QaQuestion::create([
            'customerid' => $user->userid,
            'title'      => $request->title,
            'content'    => $request->content,
            'isapproved' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Waiting for approval.',
            'data' => $question
        ], 201);
    }

    /**
     * List answerable questions (lawyer)
     *
     * Returns approved questions with fewer than 3 answers that the current lawyer
     * has not answered yet.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getQuestionsForLawyer(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Unauthorized'], 403);

        $questions = QaQuestion::where('isapproved', true)
            ->withCount('answers')
            ->having('answers_count', '<', 3)
            ->whereDoesntHave('answers', function ($q) use ($user) {
                $q->where('lawyerid', $user->userid);
            })
            ->with(['customer.customerProfile'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json(['success' => true, 'data' => $questions]);
    }

    /**
     * Submit an answer (lawyer)
     *
     * Submits an answer as pending approval. Prevents duplicate answers by the same lawyer
     * and enforces max 3 answers per question.
     *
     * @param \Illuminate\Http\Request $request
     * @param int|string $questionId
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeAnswer(Request $request, $questionId)
    {
        $user = Auth::user();
        if ($user->roleid != 2) return response()->json(['message' => 'Only lawyers.'], 403);

        $question = QaQuestion::withCount('answers')->where('questionid', $questionId)->first();

        if (!$question) return response()->json(['message' => 'Question not found.'], 404);

        if ($question->answers_count >= 3) {
            return response()->json(['message' => 'This question already has enough answers.'], 400);
        }

        $alreadyAnswered = QaAnswer::where('questionid', $questionId)
            ->where('lawyerid', $user->userid)
            ->exists();
        if ($alreadyAnswered) {
            return response()->json(['message' => 'You have already answered this question.'], 400);
        }

        $validator = Validator::make($request->all(), ['content' => 'required|string|min:10']);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $answer = QaAnswer::create([
            'questionid' => $questionId,
            'lawyerid'   => $user->userid,
            'content'    => $request->content,
            'isapproved' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Submitted. It will be public after admin approval.',
            'data' => $answer
        ], 201);
    }

    /**
     * List pending questions (admin)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPendingQuestions()
    {

        $questions = QaQuestion::where('isapproved', false)
            ->with('customer.customerProfile')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'count'   => $questions->count(),
            'data'    => $questions
        ]);
    }

    /**
     * Approve a question (admin)
     *
     * Marks the question as approved and notifies the customer.
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function approveQuestion($id)
    {
        $question = QaQuestion::findOrFail($id);
        $question->update(['isapproved' => true]);

        $this->sendNotification(
            $question->customerid,
            "Your question '{$question->title}' has been approved and is now public.",
            "/support"
        );

        return response()->json([
            'success' => true,
            'message' => 'Question approved.'
        ]);
    }

    /**
     * List pending answers (admin)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPendingAnswers()
    {
        $answers = QaAnswer::where('isapproved', false)
            ->with(['question', 'lawyer.lawyerProfile'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'count'   => $answers->count(),
            'data'    => $answers
        ]);
    }

    /**
     * Approve an answer (admin)
     *
     * Marks the answer as approved and notifies both the customer and the lawyer.
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function approveAnswer($id)
    {
        $answer = QaAnswer::with('question')->findOrFail($id);
        $answer->update(['isapproved' => true]);

        $this->sendNotification(
            $answer->question->customerid,
            "A lawyer has answered your question: '{$answer->question->title}'.",
            "/support"
        );

        $this->sendNotification(
            $answer->lawyerid,
            "Your answer to the question '{$answer->question->title}' has been approved and published.",
            "/lawyer/dashboard"
        );

        return response()->json([
            'success' => true,
            'message' => 'Answer approved.'
        ]);
    }

    /**
     * Delete an answer (admin)
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteAnswer($id)
    {
        QaAnswer::destroy($id);

        return response()->json([
            'success' => true,
            'message' => 'Deleted answer.'
        ]);
    }

    /**
     * Delete a question (admin)
     *
     * @param int|string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteQuestion($id)
    {
        $question = QaQuestion::find($id);

        if (!$question) {
            return response()->json(['message' => 'Question not found.'], 404);
        }

        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Question deleted successfully.'
        ]);
    }

    /**
     * Submit a review (customer)
     *
     * Creates a review for an owned appointment (one review per appointment) and notifies the lawyer.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeReview(Request $request)
    {
        $user = Auth::user();
        if ($user->roleid != 3) return response()->json(['message' => 'Only customers can write reviews.'], 403);

        $validator = Validator::make($request->all(), [
            'appointid' => 'required|exists:appointments,appointid',
            'rating'    => 'required|integer|min:1|max:5',
            'title'     => 'nullable|string|max:255',
            'comment'   => 'nullable|string',
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $appointment = \App\Models\Appointment::where('appointid', $request->appointid)
            ->where('customerid', $user->userid)
            ->first();

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found or access denied.'], 404);
        }

        $exists = \App\Models\Review::where('appointid', $request->appointid)->exists();
        if ($exists) {
            return response()->json(['message' => 'You have already reviewed this appointment.'], 400);
        }

        $review = \App\Models\Review::create([
            'appointid'    => $request->appointid,
            'rating'       => $request->rating,
            'title'        => $request->title,
            'comment'      => $request->comment,
            'relationship' => 'hired',
        ]);

        $this->sendNotification(
            $appointment->lawyerid,
            "A customer has left a {$request->rating}-star review for appointment #{$appointment->appointid}.",
            "/lawyer/dashboard"
        );

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully.',
            'data' => $review
        ], 201);
    }

    /**
     * List my answered questions (lawyer)
     *
     * Returns questions the current lawyer has answered, including their answers.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getMyAnsweredQuestions(Request $request)
    {
        $user = Auth::user();
        $questions = QaQuestion::whereHas('answers', function ($q) use ($user) {
            $q->where('lawyerid', $user->userid);
        })
            ->with(['customer.customerProfile', 'answers' => function ($q) use ($user) {
                $q->where('lawyerid', $user->userid)->orderBy('created_at', 'desc');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json(['success' => true, 'data' => $questions]);
    }
}
