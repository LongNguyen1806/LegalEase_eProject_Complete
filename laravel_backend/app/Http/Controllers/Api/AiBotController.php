<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Client\Response as HttpResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

use App\Models\AiChatHistory;
use App\Models\LegalKnowledgeBase;
use App\Models\ContentManagement;
use App\Models\LawyerProfile;
use App\Models\Specialization;
use App\Models\Location;

class AiBotController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate(['question' => 'required|string']);
        $userQuestion = trim($request->question);
        $user = Auth::guard('sanctum')->user();

        try {
            $intent = $this->detectIntent($userQuestion);
            $contextData = $this->buildContextData($intent, $userQuestion);
            $systemPrompt = $this->getSystemPrompt($intent, $contextData);
            $aiResponse = $this->callLlamaApi($systemPrompt, $userQuestion);

            $responseData = ['question' => $userQuestion, 'answer' => $aiResponse];

            if ($user) {
                AiChatHistory::create([
                    'userid'   => $user->userid,
                    'question' => $userQuestion,
                    'answer'   => $aiResponse,
                ]);
                $responseData['chat_id'] = $user->userid;
            }

            return response()->json([
                'success' => true,
                'intent' => $intent,
                'data' => $responseData
            ]);
        } catch (\Exception $e) {
            Log::error("AI Chat Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'The AI service is temporarily unavailable. Please try again later.'], 500);
        }
    }

    /** Detect user intent. Uses English + common Vietnamese keywords; answers are always in English. */
    private function detectIntent(string $question): string
    {
        $q = mb_strtolower($question);

        if ($this->containsAny($q, ['price', 'cost', 'fee', 'how much', 'charge', 'rate', 'charges', 'pricing', 'giá', 'chi phí', 'phí', 'bao nhiêu tiền'])) {
            return 'PRICE';
        }
        if ($this->containsAny($q, ['location', 'address', 'where', 'city', 'area', 'office', 'địa chỉ', 'ở đâu', 'khu vực', 'văn phòng'])) {
            return 'LOCATION';
        }
        if ($this->containsAny($q, ['specialty', 'specialties', 'field', 'practice area', 'expertise', 'type of law', 'lĩnh vực', 'chuyên môn', 'chuyên ngành'])) {
            return 'SPECIALTY';
        }
        if ($this->containsAny($q, ['experience', 'years of experience', 'how long', 'experienced', 'kinh nghiệm', 'bao lâu'])) {
            return 'EXPERIENCE';
        }
        if ($this->containsAny($q, ['book', 'booking', 'appointment', 'schedule', 'how to book', 'make an appointment', 'set up', 'đặt lịch', 'đặt hẹn'])) {
            return 'BOOKING';
        }
        if ($this->containsAny($q, ['find lawyer', 'find a lawyer', 'lawyer in', 'recommend', 'list of lawyers', 'which lawyer', 'tìm luật sư', 'luật sư ở', 'luật sư tại', 'cần luật sư'])) {
            return 'FIND_LAWYER';
        }
        if ($this->containsAny($q, [
            'law', 'legal', 'regulation', 'article', 'clause', 'right', 'rights',
            'luật', 'điều khoản', 'quy định', 'văn bản',
            'product', 'defective', 'defect', 'liability', 'consumer', 'standards', 'technical',
            'compensation', 'damage', 'contract', 'claim', 'warranty', 'responsibility',
            'fault', 'obligation', 'civil', 'guarantee', 'quality', 'considered', 'meets'
        ])) {
            return 'LEGAL_KNOWLEDGE';
        }
        if ($this->containsAny($q, ['hello', 'hi', 'hey', 'thanks', 'thank you', 'bye', 'xin chào', 'chào'])) {
            return 'GREETING';
        }

        return 'GENERAL';
    }

    private function buildContextData(string $intent, string $question)
    {
        $keywords = $this->extractKeywords($question);

        switch ($intent) {
            case 'PRICE':
                return $this->queryPriceFromLawyerSpecialties($keywords);
            case 'LOCATION':
                return $this->queryLocations($keywords);
            case 'SPECIALTY':
                return $this->querySpecialties($keywords);
            case 'EXPERIENCE':
                return $this->queryExperienceContext();
            case 'BOOKING':
                return $this->queryBookingGuide();
            case 'LEGAL_KNOWLEDGE':
                return $this->queryLegalKnowledgeBase($keywords);
            case 'FIND_LAWYER':
                return $this->queryLawyersForContext($question, $keywords);
            case 'GREETING':
                return '';
            case 'GENERAL':
                $kb = $this->queryLegalKnowledgeBase($keywords);
                if ($kb !== '') {
                    return $kb;
                }
                return '';
            default:
                return '';
        }
    }

    private function getSystemPrompt(string $intent, string $contextData): string
    {
        $base = "You are the LegalEase legal assistant. RULES:\n" .
            "1. Reply in English only.\n" .
            "2. Use ONLY the CONTEXT data below. If CONTEXT is empty or insufficient, say: 'There is no information on this in our system. Please contact a lawyer or visit our Find Lawyers page.'\n" .
            "3. Be professional and neutral. Do not conclude guilt or legal liability.\n" .
            "4. When listing lawyers, use format: [Name](/lawyers/{id}).\n";

        $contextLabel = $contextData === '' ? "NO DATA" : $contextData;

        switch ($intent) {
            case 'PRICE':
                $instruction = "Explain the price ranges from CONTEXT. Say these are reference prices and actual fees depend on the case; suggest contacting the lawyer for details.";
                break;
            case 'LOCATION':
                $instruction = "Summarize lawyer locations/offices from CONTEXT. Tell the user which cities/areas have lawyers and how to find them on the site.";
                break;
            case 'SPECIALTY':
                $instruction = "List and briefly describe practice areas/specialties from CONTEXT. Guide the user to the Find Lawyers page to filter by specialty.";
                break;
            case 'EXPERIENCE':
                $instruction = "Explain how experience is shown (years, profile). Use CONTEXT if it contains concrete numbers; otherwise guide the user to lawyer profiles.";
                break;
            case 'BOOKING':
                $instruction = "Describe step-by-step how to book an appointment using CONTEXT. Do not output raw URLs; describe navigation (e.g. 'Go to Find Lawyers on the menu, choose a lawyer, then click Book appointment').";
                break;
            case 'LEGAL_KNOWLEDGE':
                $instruction = "Answer using only the legal text in CONTEXT. Cite source/law name and article where relevant. End with a suggestion to consult a lawyer for their specific case.";
                break;
            case 'FIND_LAWYER':
                $instruction = "Suggest suitable lawyers from CONTEXT. If CONTEXT lists lawyers, present them clearly with name and link format [Name](/lawyers/{id}). Otherwise tell the user to use the Find Lawyers page and filters.";
                break;
            case 'GREETING':
                $instruction = "Give a short, friendly greeting and offer help with lawyer info, prices, locations, specialties, booking, or legal knowledge.";
                break;
            case 'GENERAL':
            default:
                if ($contextLabel !== "NO DATA") {
                    $instruction = "Answer based on CONTEXT. If the question is about legal/lawyer/booking topics, use CONTEXT. Keep the reply in English.";
                } else {
                    $instruction = "Politely decline: 'I can only help with LegalEase services—lawyer information, prices, locations, specialties, experience, how to book, and general legal knowledge. Please ask something related to our services.'";
                }
                break;
        }

        return $base . "\nTASK: " . $instruction . "\n\nCONTEXT:\n" . $contextLabel;
    }

    /** Price from lawyer_specialties (specminprice, specmaxprice) by specialization */
    private function queryPriceFromLawyerSpecialties(array $keywords): string
    {
        $query = DB::table('lawyer_specialties')
            ->join('specializations', 'lawyer_specialties.specid', '=', 'specializations.specid')
            ->select(
                'specializations.specname',
                DB::raw('MIN(lawyer_specialties.specminprice) as min_price'),
                DB::raw('MAX(lawyer_specialties.specmaxprice) as max_price')
            )
            ->groupBy('specializations.specid', 'specializations.specname');

        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $w) {
                    $q->orWhere('specializations.specname', 'like', '%' . $w . '%');
                }
            });
        }

        $rows = $query->get();

        if ($rows->isEmpty()) {
            return "No price data found for the requested specialty. Our lawyers set their own consultation rates; please check each lawyer's profile or the Find Lawyers page.";
        }

        $lines = [];
        foreach ($rows as $r) {
            $min = (float) $r->min_price;
            $max = (float) $r->max_price;
            $lines[] = sprintf('%s: from %s to %s $', $r->specname, number_format($min), number_format($max));
        }
        return "Consultation price ranges by specialty (from lawyer_specialties):\n" . implode("\n", $lines);
    }

    /** Locations where lawyers have offices */
    private function queryLocations(array $keywords): string
    {
        $query = DB::table('lawyer_offices')
            ->join('locations', 'lawyer_offices.locid', '=', 'locations.locid')
            ->join('lawyer_profiles', 'lawyer_offices.lawyerid', '=', 'lawyer_profiles.lawyerid')
            ->where('lawyer_profiles.isverified', true)
            ->select('locations.locid', 'locations.cityname', 'lawyer_offices.addressdetail', 'lawyer_profiles.fullname', 'lawyer_profiles.lawyerid')
            ->distinct();

        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $w) {
                    $q->orWhere('locations.cityname', 'like', '%' . $w . '%')
                        ->orWhere('lawyer_offices.addressdetail', 'like', '%' . $w . '%');
                }
            });
        }

        $rows = $query->limit(20)->get();

        if ($rows->isEmpty()) {
            return "No lawyer offices found for that area. You can browse all locations on the Find Lawyers page.";
        }

        $byCity = [];
        foreach ($rows as $r) {
            $city = $r->cityname ?? 'Unknown';
            if (!isset($byCity[$city])) {
                $byCity[$city] = [];
            }
            $byCity[$city][] = $r->fullname . ' – ' . ($r->addressdetail ?? '') . ' [Lawyer ID: ' . $r->lawyerid . ']';
        }

        $out = "Lawyer offices by location:\n";
        foreach ($byCity as $city => $list) {
            $out .= "\n" . $city . ":\n" . implode("\n", array_slice($list, 0, 5));
            if (count($list) > 5) {
                $out .= "\n  ... and " . (count($list) - 5) . " more.";
            }
        }
        return $out;
    }

    /** List specialties / practice areas */
    private function querySpecialties(array $keywords): string
    {
        $query = Specialization::query();

        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $w) {
                    $q->orWhere('specname', 'like', '%' . $w . '%');
                }
            });
        }

        $specs = $query->limit(30)->get();

        if ($specs->isEmpty()) {
            return "No matching specialties. You can see all practice areas on the Find Lawyers page when you use the filters.";
        }

        $names = $specs->pluck('specname')->toArray();
        return "Practice areas / specialties:\n" . implode(", ", $names);
    }

    /** Experience: short guidance + sample from lawyer_profiles */
    private function queryExperienceContext(): string
    {
        $lawyers = LawyerProfile::where('isverified', true)
            ->whereNotNull('experienceyears')
            ->orderByDesc('experienceyears')
            ->limit(5)
            ->get(['lawyerid', 'fullname', 'experienceyears']);

        if ($lawyers->isEmpty()) {
            return "Experience is shown on each lawyer's profile. Go to Find Lawyers, open a lawyer's profile, and check their experience there.";
        }

        $lines = [];
        foreach ($lawyers as $l) {
            $y = (int) $l->experienceyears;
            $lines[] = $l->fullname . " (" . $y . " year(s)) – profile: /lawyers/" . $l->lawyerid;
        }
        return "Some of our lawyers and their experience (years):\n" . implode("\n", $lines) .
            "\n\nYou can see every lawyer's experience on their profile page.";
    }

    /** How to book: from ContentManagement or fixed English steps */
    private function queryBookingGuide(): string
    {
        $guides = ContentManagement::whereIn('type', ['FAQ', 'Guide'])
            ->where(function ($q) {
                $q->where('title', 'like', '%book%')
                    ->orWhere('title', 'like', '%appointment%')
                    ->orWhere('body', 'like', '%book%')
                    ->orWhere('body', 'like', '%appointment%');
            })
            ->limit(3)
            ->get();

        if ($guides->isNotEmpty()) {
            $out = "";
            foreach ($guides as $g) {
                $out .= "Title: " . $g->title . "\nContent: " . mb_substr($g->body, 0, 500) . "\n\n";
            }
            return trim($out);
        }

        return "How to book an appointment on LegalEase:\n" .
            "1. Go to the Find Lawyers section (or home page).\n" .
            "2. Use filters (location, specialty) if you like.\n" .
            "3. Open a lawyer's profile and check their available slots.\n" .
            "4. Click 'Book appointment' and choose date and time.\n" .
            "5. Confirm your booking. You will need to log in or register if you have not already.";
    }

    /** Search legal_knowledge_base; uses keyword variants and fallback to improve match rate. */
    private function queryLegalKnowledgeBase(array $keywords): string
    {
        $terms = $this->expandSearchTerms($keywords);
        if (empty($terms)) {
            return "";
        }

        $results = LegalKnowledgeBase::where(function ($query) use ($terms) {
            foreach ($terms as $word) {
                $w = trim($word);
                if ($w === '') continue;
                $query->orWhere('title', 'like', '%' . $w . '%')
                    ->orWhere('content', 'like', '%' . $w . '%')
                    ->orWhere('lawname', 'like', '%' . $w . '%');
            }
        })->limit(8)->get();

        if ($results->isEmpty() && count($keywords) > 2) {
            $fallback = array_slice(array_filter($keywords, fn($k) => mb_strlen($k) >= 4), 0, 4);
            $fallbackTerms = $this->expandSearchTerms($fallback);
            if (!empty($fallbackTerms)) {
                $results = LegalKnowledgeBase::where(function ($query) use ($fallbackTerms) {
                    foreach ($fallbackTerms as $w) {
                        $w = trim($w);
                        if ($w === '') continue;
                        $query->orWhere('title', 'like', '%' . $w . '%')
                            ->orWhere('content', 'like', '%' . $w . '%')
                            ->orWhere('lawname', 'like', '%' . $w . '%');
                    }
                })->limit(8)->get();
            }
        }

        if ($results->isEmpty()) {
            return "";
        }

        $context = "";
        foreach ($results->unique('lawid') as $item) {
            $short = mb_strlen($item->content) > 500 ? mb_substr($item->content, 0, 500) . "..." : $item->content;
            $context .= "Source: {$item->lawname}\nTitle: {$item->title}\nContent: {$short}\n\n";
        }
        return trim($context);
    }

    /** Add simple variants (e.g. defective->defect, products->product) to improve match in legal_knowledge_base. */
    private function expandSearchTerms(array $keywords): array
    {
        $out = [];
        foreach ($keywords as $k) {
            $k = trim(mb_strtolower($k));
            if ($k === '' || mb_strlen($k) < 2) continue;
            $out[$k] = true;
            if (mb_strlen($k) <= 3) continue;
            if (mb_substr($k, -3) === 'ive' && mb_strlen($k) > 4) {
                $out[mb_substr($k, 0, -3) . 't'] = true; 
            }
            if (mb_substr($k, -1) === 's' && mb_strlen($k) > 3) {
                $out[mb_substr($k, 0, -1)] = true; 
            }
            if (mb_substr($k, -2) === 'ed' && mb_strlen($k) > 4) {
                $out[mb_substr($k, 0, -2)] = true; 
            }
        }
        return array_keys($out);
    }

    /** Find lawyers by location/specialty for context */
    private function queryLawyersForContext(string $question, array $keywords)
    {
        $q = LawyerProfile::with(['office.location', 'specializations'])
            ->where('isverified', true);

        $loc = null;
        $locations = Location::all();
        foreach ($locations as $l) {
            if (mb_stripos($question, $l->cityname) !== false) {
                $loc = $l;
                break;
            }
        }

        if ($loc) {
            $q->whereHas('office', fn($o) => $o->where('locid', $loc->locid));
        }

        $spec = null;
        foreach (Specialization::all() as $s) {
            if (mb_stripos($question, $s->specname) !== false) {
                $spec = $s;
                break;
            }
        }
        if (!$spec && !empty($keywords)) {
            foreach (Specialization::all() as $s) {
                foreach ($keywords as $kw) {
                    if (mb_stripos($s->specname, $kw) !== false) {
                        $spec = $s;
                        break 2;
                    }
                }
            }
        }

        if ($spec) {
            $q->whereHas('specializations', fn($s) => $s->where('specializations.specid', $spec->specid));
        }

        $lawyers = $q->inRandomOrder()->limit(5)->get();

        if ($lawyers->isEmpty()) {
            $lawyers = LawyerProfile::with(['office.location', 'specializations'])
                ->where('isverified', true)
                ->inRandomOrder()
                ->limit(3)
                ->get();
        }

        if ($lawyers->isEmpty()) {
            return "No lawyers match your criteria. Please try the Find Lawyers page and use filters for location and specialty.";
        }

        $lines = [];
        foreach ($lawyers as $l) {
            $specs = $l->specializations->pluck('specname')->implode(', ');
            $locStr = $l->office && $l->office->location ? $l->office->location->cityname : '';
            $lines[] = "[{$l->fullname}](/lawyers/{$l->lawyerid}) – " . ($specs ?: 'General') . ($locStr ? " – {$locStr}" : '');
        }
        return "Suggested lawyers:\n" . implode("\n", $lines);
    }

    private function extractKeywords(string $question): array
    {
        $str = mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $question));
        $stopWords = [
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
            'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its',
            'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
            'am', 'get', 'please', 'tell', 'want', 'know', 'like', 'just', 'about', 'and', 'or', 'but', 'if', 'then',
            'yes', 'no', 'ok', 'okay', 'yeah', 'hey', 'hi', 'hello'
        ];
        $words = array_filter(preg_split('/\s+/', $str), function ($w) use ($stopWords) {
            return !in_array($w, $stopWords) && mb_strlen($w) >= 2;
        });
        return array_values(array_slice(array_values($words), 0, 10));
    }

    private function containsAny(string $str, array $keywords): bool
    {
        foreach ($keywords as $word) {
            if (mb_stripos($str, $word) !== false) {
                return true;
            }
        }
        return false;
    }

    private function callLlamaApi(string $systemPrompt, string $userMessage): string
    {
        $apiKey = env('GROQ_API_KEY');
        $url = 'https://api.groq.com/openai/v1/chat/completions';

        if (!$apiKey) {
            return "Demo mode: Please configure GROQ_API_KEY to use the assistant.";
        }

        /** @var HttpResponse $response */
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type'  => 'application/json',
        ])->post($url, [
            'model'       => 'llama-3.3-70b-versatile',
            'messages'    => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userMessage],
            ],
            'temperature' => 0.2,
            'max_tokens'  => 1000,
        ]);

        if ($response->successful()) {
            return trim($response->json()['choices'][0]['message']['content'] ?? '');
        }

        Log::error("Groq API Error: " . $response->body());
        return "Sorry, I'm having trouble connecting. Please try again later.";
    }

    // --- Admin / Knowledge base endpoints (unchanged logic, English messages where appropriate) ---

    public function importLawFile(Request $request)
    {
        $request->validate([
            'file'    => 'required|mimes:txt|max:10240',
            'specid'  => 'required|integer|exists:specializations,specid',
            'lawname' => 'required|string',
        ]);

        try {
            $file = $request->file('file');
            $rawText = file_get_contents($file->getPathname());
            $encoding = mb_detect_encoding($rawText, ['UTF-8', 'ISO-8859-1', 'WINDOWS-1252'], true);
            $rawText = $encoding ? mb_convert_encoding($rawText, 'UTF-8', $encoding) : $rawText;
            $lines = explode("\n", $rawText);

            $currentChapter = $currentSection = "";
            $articlesBuffer = [];
            $currentArticle = null;

            foreach ($lines as $line) {
                $line = trim(preg_replace('#<[^>]+>#', '', $line));
                if ($line === '') continue;
                if (preg_match('@^(OFFICIAL GAZETTE|CÔNG BÁO|Page \d+|Trang \d+|\d+)$@i', $line)) continue;

                if (preg_match('@^(Chương|Chapter)\s+[IVX0-9]+@ui', $line)) {
                    $currentChapter = $line;
                    $currentSection = "";
                    continue;
                }
                if (preg_match('@^(Mục|Section)\s+\d+@ui', $line)) {
                    $currentSection = $line;
                    continue;
                }
                if (preg_match('@^\s*(Điều|Article)\s+\d+[\.\s]@ui', $line)) {
                    if ($currentArticle) {
                        $articlesBuffer[] = $currentArticle;
                    }
                    $fullTitle = ($currentChapter ? $currentChapter . " - " : "") . ($currentSection ? $currentSection . " - " : "") . $line;
                    $currentArticle = ['title' => mb_substr($fullTitle, 0, 255), 'content' => $line . "\n"];
                } else {
                    if ($currentArticle) {
                        $currentArticle['content'] .= $line . "\n";
                    }
                }
            }
            if ($currentArticle) {
                $articlesBuffer[] = $currentArticle;
            }

            if (empty($articlesBuffer)) {
                return response()->json(['success' => false, 'message' => 'No "Article" or "Clause" headers found in the document.'], 422);
            }

            DB::beginTransaction();
            LegalKnowledgeBase::where('lawname', $request->lawname)->delete();
            if (LegalKnowledgeBase::count() === 0) {
                DB::statement('ALTER TABLE legal_knowledge_base AUTO_INCREMENT = 1');
            }
            $count = 0;
            foreach ($articlesBuffer as $i => $item) {
                if (mb_strlen($item['content']) < 20) continue;
                LegalKnowledgeBase::create([
                    'specid'     => $request->specid,
                    'lawname'    => $request->lawname,
                    'title'      => $item['title'],
                    'content'    => trim($item['content']),
                    'chunkorder' => $i + 1,
                ]);
                $count++;
            }
            DB::commit();

            return response()->json(['success' => true, 'message' => "Imported {$count} chunks into the knowledge base."]);
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error("Import Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'System error: ' . $e->getMessage()], 500);
        }
    }

    public function getKnowledgeBase(Request $request)
    {
        if ($request->filled('detail_lawname')) {
            $data = LegalKnowledgeBase::where('lawname', $request->detail_lawname)
                ->with('specialization')
                ->orderBy('chunkorder')
                ->get();
            return response()->json(['success' => true, 'data' => $data]);
        }

        $data = LegalKnowledgeBase::select('lawname', 'specid', DB::raw('count(*) as total_chunks'))
            ->with('specialization')
            ->groupBy('lawname', 'specid')
            ->orderBy('lawname')
            ->get();
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function deleteLawByGroup(Request $request)
    {
        $request->validate(['lawname' => 'required|string']);
        try {
            $deleted = LegalKnowledgeBase::where('lawname', $request->lawname)->delete();
            DB::statement("ALTER TABLE legal_knowledge_base AUTO_INCREMENT = 1");
            return response()->json([
                'success' => true,
                'message' => "Deleted law '{$request->lawname}' and {$deleted} related records.",
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateKnowledge(Request $request, $id)
    {
        LegalKnowledgeBase::findOrFail($id)->update($request->all());
        return response()->json(['success' => true, 'message' => 'Updated.']);
    }

    public function getAdminChatLogs()
    {
        $logs = AiChatHistory::with('user:userid,email')->orderByDesc('chatid')->limit(50)->get();
        return response()->json(['success' => true, 'data' => $logs]);
    }
}
