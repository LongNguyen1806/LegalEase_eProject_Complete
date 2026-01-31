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
            $suggestedLawyers = is_array($contextData) ? ($contextData['suggested_lawyers'] ?? []) : [];
            $systemPrompt = $this->getSystemPrompt($intent, $contextData);
            $aiResponse = $this->callLlamaApi($systemPrompt, $userQuestion);

            $answer = $this->sanitizeLawyerLinksInAnswer($aiResponse, !empty($suggestedLawyers));
            $responseData = ['question' => $userQuestion, 'answer' => $answer];
            if (!empty($suggestedLawyers)) {
                $responseData['suggested_lawyers'] = $suggestedLawyers;
            }

            if ($user) {
                AiChatHistory::create([
                    'userid'   => $user->userid,
                    'question' => $userQuestion,
                    'answer'   => $answer,
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
        if ($this->containsAny($q, ['find lawyer', 'find a lawyer', 'lawyer in', 'recommend', 'list of lawyers', 'which lawyer', 'tìm luật sư', 'luật sư ở', 'luật sư tại', 'cần luật sư', 'có luật sư', 'luật sư về', 'luật sư nào', 'luật sư'])) {
            return 'FIND_LAWYER';
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
        if ($this->containsAny($q, [
            'law', 'legal', 'regulation', 'article', 'clause', 'right', 'rights',
            'luật', 'điều khoản', 'quy định', 'văn bản',
            'product', 'defective', 'defect', 'liability', 'consumer', 'standards', 'technical',
            'compensation', 'damage', 'contract', 'claim', 'warranty', 'responsibility',
            'fault', 'obligation', 'civil', 'guarantee', 'quality', 'considered', 'meets',
            'marriage', 'family', 'divorce', 'dissolution', 'ly hôn', 'hôn nhân', 'gia đình', 'thủ tục ly hôn', 'luật hôn nhân'
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
                $exp = $this->queryExperienceContext();
                return [
                    'context' => $exp['context'],
                    'suggested_lawyers' => $this->formatSuggestedLawyers($exp['lawyers']),
                ];
            case 'BOOKING':
                return $this->queryBookingGuide();
            case 'LEGAL_KNOWLEDGE':
                return $this->queryLegalKnowledgeBase($keywords, $question);
            case 'FIND_LAWYER':
                $find = $this->queryLawyersForContext($question, $keywords);
                return [
                    'context' => $find['context'],
                    'suggested_lawyers' => $this->formatSuggestedLawyers($find['lawyers']),
                ];
            case 'GREETING':
                return '';
            case 'GENERAL':
                $kb = $this->queryLegalKnowledgeBase($keywords, $question);
                if ($kb !== '') {
                    return $kb;
                }
                return '';
            default:
                return '';
        }
    }

    /** @param string|array{context: string, suggested_lawyers: array} $contextData */
    private function getSystemPrompt(string $intent, $contextData): string
    {
        $contextString = is_array($contextData) ? $contextData['context'] : $contextData;
        $hasSuggestedLawyers = is_array($contextData) && !empty($contextData['suggested_lawyers']);

        $base = "You are the LegalEase legal assistant. RULES:\n" .
            "1. Reply in the SAME language as the user's question: if the user asked mainly in Vietnamese, reply in Vietnamese; if mainly in English, reply in English. Do not mix—match the user's language.\n" .
            "2. Use ONLY the CONTEXT data below. If CONTEXT is empty or insufficient, say: 'There is no information on this in our system. Please visit LegalEase Find Lawyers page on this site to find a lawyer.'\n" .
            "3. Be professional and neutral. Do not conclude guilt or legal liability.\n" .
            "4. Always recommend finding a lawyer on LegalEase (this website). Never suggest other platforms, Google search, or external legal services. Say 'visit our Find Lawyers page' or 'use LegalEase to find a lawyer'.\n" .
            "5. Never use the word 'CONTEXT' in your reply to the user. If you do not have the content of a specific article or point, say for example: 'This article is not detailed in our current materials' or 'We do not have the full text of this article in our database'—never mention CONTEXT.\n";
        if ($hasSuggestedLawyers) {
            $base .= "6. Do NOT output markdown links to lawyers. Suggested lawyers will be shown separately. Only mention lawyer names and criteria (e.g. 'Here are some lawyers that may suit your needs' or briefly describe filters). Do not invent any lawyer IDs or URLs.\n";
        } else {
            $base .= "6. When listing lawyers, use ONLY links that appear in CONTEXT; do not create or change any ID.\n";
        }

        $contextLabel = $contextString === '' ? "NO DATA" : $contextString;

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
                $instruction = "Explain how experience is shown (years, profile). Use CONTEXT if it contains concrete numbers. Do not output lawyer links; suggested lawyers will be shown separately. Keep the reply short.";
                break;
            case 'BOOKING':
                $instruction = "Describe step-by-step how to book an appointment using CONTEXT. Do not output raw URLs; describe navigation (e.g. 'Go to Find Lawyers on the menu, choose a lawyer, then click Book appointment').";
                break;
            case 'LEGAL_KNOWLEDGE':
                $instruction = "Answer using only the legal text in CONTEXT. Reply in the same language as the user's question (Vietnamese or English). Cite source/law name and article where relevant. If a specific article is not in the materials provided, say 'This article is not detailed in our current materials' or skip it—never write 'no information in CONTEXT' or mention CONTEXT to the user. Always end by suggesting the user to find a lawyer on LegalEase (our Find Lawyers page on this site). Do not recommend other platforms or external search.";
                break;
            case 'FIND_LAWYER':
                $instruction = "Suggest suitable lawyers from CONTEXT. Reply in the same language as the user's question (Vietnamese or English). Do not output markdown links; suggested lawyers will be shown separately. Write a short intro and briefly describe the criteria. Otherwise tell the user to use the Find Lawyers page and filters.";
                break;
            case 'GREETING':
                $instruction = "Give a short, friendly greeting in the same language as the user (Vietnamese or English) and offer help with lawyer info, prices, locations, specialties, booking, or legal knowledge.";
                break;
            case 'GENERAL':
            default:
                if ($contextLabel !== "NO DATA") {
                    $instruction = "Answer based on CONTEXT. If the question is about legal/lawyer/booking topics, use CONTEXT. Reply in the same language as the user's question. Always suggest finding a lawyer on LegalEase (Find Lawyers on this site), never other platforms.";
                } else {
                    $instruction = "Politely decline in the user's language (Vietnamese or English): e.g. 'I can only help with LegalEase services—lawyer information, prices, locations, specialties, experience, how to book, and general legal knowledge. Please ask something related to our services.'";
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
    /** @return array{context: string, lawyers: \Illuminate\Support\Collection} */
    private function queryExperienceContext(): array
    {
        $lawyers = LawyerProfile::where('isverified', true)
            ->whereNotNull('experienceyears')
            ->orderByDesc('experienceyears')
            ->limit(5)
            ->get(['lawyerid', 'fullname', 'experienceyears']);

        if ($lawyers->isEmpty()) {
            return [
                'context' => "Experience is shown on each lawyer's profile. Go to Find Lawyers, open a lawyer's profile, and check their experience there.",
                'lawyers' => collect([]),
            ];
        }

        $lines = [];
        foreach ($lawyers as $l) {
            $y = (int) $l->experienceyears;
            $lines[] = $l->fullname . " (ID: {$l->lawyerid}, " . $y . " year(s))";
        }
        return [
            'context' => "Some of our lawyers and their experience (years):\n" . implode("\n", $lines) .
                "\n\nYou can see every lawyer's experience on their profile page.",
            'lawyers' => $lawyers,
        ];
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

    /**
     * Search legal_knowledge_base using FULLTEXT(content) when possible for speed, then LIKE fallback.
     * Uses idx_specid when specid can be inferred from keywords. Supports Vietnamese via Vi→En term map.
     */
    private function queryLegalKnowledgeBase(array $keywords, string $question = ''): string
    {
        $allKeywords = $keywords;
        if ($question !== '') {
            $englishFromVietnamese = $this->getEnglishTermsFromVietnameseQuestion($question);
            $allKeywords = array_values(array_unique(array_merge($keywords, $englishFromVietnamese)));
        }
        $terms = $this->expandSearchTerms($allKeywords);
        if (empty($terms)) {
            return "";
        }

        $specid = $this->resolveSpecidFromKeywords($allKeywords);

        $results = $this->searchLegalKnowledgeBaseFulltext($terms, $specid, 12);
        if ($results->isEmpty()) {
            $results = $this->searchLegalKnowledgeBaseLike($terms, $specid, 12);
        }
        if ($results->isEmpty() && count($allKeywords) > 2) {
            $fallback = array_slice(array_filter($allKeywords, fn($k) => mb_strlen($k) >= 4), 0, 4);
            $fallbackTerms = $this->expandSearchTerms($fallback);
            if (!empty($fallbackTerms)) {
                $results = $this->searchLegalKnowledgeBaseFulltext($fallbackTerms, $specid, 12);
                if ($results->isEmpty()) {
                    $results = $this->searchLegalKnowledgeBaseLike($fallbackTerms, $specid, 12);
                }
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

    /** Resolve specid from keywords (match specialization name) to use idx_specid. */
    private function resolveSpecidFromKeywords(array $keywords): ?int
    {
        if (empty($keywords)) {
            return null;
        }
        foreach (Specialization::all() as $s) {
            foreach ($keywords as $kw) {
                if (mb_strlen($kw) >= 2 && mb_stripos($s->specname, $kw) !== false) {
                    return (int) $s->specid;
                }
            }
        }
        return null;
    }

    /** Search using FULLTEXT(content) index; terms with length >= 3. Returns collection. */
    private function searchLegalKnowledgeBaseFulltext(array $terms, ?int $specid, int $limit)
    {
        $fulltextTerms = array_values(array_filter(array_map('trim', $terms), fn($t) => mb_strlen($t) >= 3));
        if (empty($fulltextTerms)) {
            return collect([]);
        }
        $searchString = implode(' ', array_unique($fulltextTerms));
        $query = LegalKnowledgeBase::whereRaw('MATCH(content) AGAINST(? IN NATURAL LANGUAGE MODE)', [$searchString])
            ->orderByRaw('MATCH(content) AGAINST(? IN NATURAL LANGUAGE MODE) DESC', [$searchString])
            ->limit($limit);
        if ($specid !== null) {
            $query->where('specid', $specid);
        }
        return $query->get();
    }

    /** Fallback: search with LIKE on title, content, lawname (when FULLTEXT returns nothing). */
    private function searchLegalKnowledgeBaseLike(array $terms, ?int $specid, int $limit)
    {
        $query = LegalKnowledgeBase::where(function ($q) use ($terms) {
            foreach ($terms as $word) {
                $w = trim($word);
                if ($w === '') continue;
                $q->orWhere('title', 'like', '%' . $w . '%')
                    ->orWhere('content', 'like', '%' . $w . '%')
                    ->orWhere('lawname', 'like', '%' . $w . '%');
            }
        })->limit($limit);
        if ($specid !== null) {
            $query->where('specid', $specid);
        }
        return $query->get();
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

    /**
     * Vietnamese → English legal term map so Vietnamese questions can match English chunks in legal_knowledge_base.
     * Keys: Vietnamese phrase (longer phrases first when matching). Values: English terms to search.
     */
    private function getVietnameseToEnglishLegalTerms(): array
    {
        return [
            // Marriage & family (longer phrases first)
            'luật hôn nhân gia đình' => ['marriage', 'family', 'family law', 'marriage and family'],
            'thủ tục ly hôn' => ['divorce', 'divorce procedure', 'dissolution', 'marriage', 'dissolution of marriage'],
            'ly hôn' => ['divorce', 'dissolution', 'dissolution of marriage'],
            'hôn nhân gia đình' => ['marriage', 'family', 'family law'],
            'hôn nhân' => ['marriage', 'marital', 'marriage and family'],
            'gia đình' => ['family', 'family law'],
            'thủ tục' => ['procedure', 'procedures'],
            'kết hôn' => ['marriage', 'marry', 'marital'],
            'tranh chấp' => ['dispute', 'disputes', 'dispute resolution'],
            'nuôi con' => ['child', 'children', 'custody', 'parenting'],
            'cấp dưỡng' => ['maintenance', 'alimony', 'support'],
            'tài sản chung' => ['property', 'matrimonial', 'joint property'],
            // Consumer & civil (existing)
            'trách nhiệm pháp lý' => ['liability', 'legal responsibility'],
            'sản phẩm có khuyết tật' => ['defective product', 'defective products'],
            'trách nhiệm sản phẩm' => ['product liability'],
            'bồi thường thiệt hại' => ['compensation', 'damages'],
            'quy định pháp luật' => ['regulation', 'legal provision', 'law'],
            'hợp đồng' => ['contract', 'contracts'],
            'bồi thường' => ['compensation', 'damages'],
            'sản phẩm' => ['product', 'products'],
            'khuyết tật' => ['defect', 'defective', 'defects'],
            'lỗi' => ['defect', 'fault', 'faulty'],
            'trách nhiệm' => ['liability', 'responsibility'],
            'quy định' => ['regulation', 'provision', 'provisions'],
            'điều khoản' => ['article', 'clause', 'articles', 'clauses'],
            'luật' => ['law', 'legal'],
            'văn bản pháp luật' => ['law', 'legal document', 'regulation'],
            'người tiêu dùng' => ['consumer', 'consumers'],
            'chất lượng' => ['quality', 'standards'],
            'tiêu chuẩn' => ['standard', 'standards', 'technical'],
            'kỹ thuật' => ['technical', 'standards'],
            'bảo hành' => ['warranty', 'guarantee'],
            'bảo đảm' => ['guarantee', 'warranty'],
            'khiếu nại' => ['claim', 'complaint', 'claims'],
            'thiệt hại' => ['damage', 'damages'],
            'nghĩa vụ' => ['obligation', 'obligations'],
            'dân sự' => ['civil'],
            'vi phạm' => ['violation', 'breach', 'fault'],
            'thương mại' => ['commercial', 'trade'],
            'đòi bồi thường' => ['compensation', 'claim', 'damages'],
            'quyền' => ['right', 'rights'],
            'pháp lý' => ['legal', 'liability'],
            'pháp luật' => ['law', 'legal'],
            'điều luật' => ['article', 'clause', 'provision'],
            'chứng minh' => ['proof', 'prove', 'evidence'],
            'chứng cứ' => ['evidence', 'proof'],
        ];
    }

    /**
     * From a question (Vietnamese or mixed), extract English equivalent terms using the Vi→En map.
     * Used so that Vietnamese questions can match English-only content in legal_knowledge_base.
     */
    private function getEnglishTermsFromVietnameseQuestion(string $question): array
    {
        $q = mb_strtolower(trim($question));
        $map = $this->getVietnameseToEnglishLegalTerms();
        $keys = array_keys($map);
        usort($keys, fn($a, $b) => mb_strlen($b) - mb_strlen($a));

        $englishTerms = [];
        foreach ($keys as $vietnamesePhrase) {
            if (mb_strpos($q, $vietnamesePhrase) !== false) {
                $englishTerms = array_merge($englishTerms, $map[$vietnamesePhrase]);
            }
        }
        return array_values(array_unique($englishTerms));
    }

    /**
     * Resolve specialization from question: direct specname match, keyword match, or Vietnamese→English specialty map
     * (e.g. "hôn nhân gia đình" → spec with "marriage" or "family" in name).
     */
    private function resolveSpecializationFromQuestion(string $question, array $keywords): ?Specialization
    {
        $q = mb_strtolower($question);
        $specs = Specialization::all();

        foreach ($specs as $s) {
            if (mb_stripos($q, mb_strtolower($s->specname)) !== false) {
                return $s;
            }
        }
        if (!empty($keywords)) {
            foreach ($specs as $s) {
                foreach ($keywords as $kw) {
                    if (mb_strlen($kw) >= 2 && mb_stripos($s->specname, $kw) !== false) {
                        return $s;
                    }
                }
            }
        }
        foreach ($specs as $s) {
            $specLower = mb_strtolower($s->specname);
            if (mb_strpos($q, 'hôn nhân') !== false || mb_strpos($q, 'gia đình') !== false) {
                if (mb_strpos($specLower, 'marriage') !== false || mb_strpos($specLower, 'family') !== false) {
                    return $s;
                }
            }
            if (mb_strpos($q, 'thương mại') !== false && mb_strpos($specLower, 'commercial') !== false) {
                return $s;
            }
            if (mb_strpos($q, 'tiêu dùng') !== false && mb_strpos($specLower, 'consumer') !== false) {
                return $s;
            }
        }
        return null;
    }

    /** Find lawyers by location/specialty for context. Returns [context, lawyers]. */
    private function queryLawyersForContext(string $question, array $keywords): array
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

        $spec = $this->resolveSpecializationFromQuestion($question, $keywords);

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
            return [
                'context' => "No lawyers match your criteria. Please try the Find Lawyers page and use filters for location and specialty.",
                'lawyers' => collect([]),
            ];
        }

        $lines = [];
        foreach ($lawyers as $l) {
            $specs = $l->specializations->pluck('specname')->implode(', ');
            $locStr = $l->office && $l->office->location ? $l->office->location->cityname : '';
            $lines[] = "{$l->fullname} (ID: {$l->lawyerid}) – " . ($specs ?: 'General') . ($locStr ? " – {$locStr}" : '');
        }
        return [
            'context' => "Suggested lawyers:\n" . implode("\n", $lines),
            'lawyers' => $lawyers,
        ];
    }

    /** @param \Illuminate\Support\Collection $lawyers Collection of LawyerProfile (lawyerid, fullname). */
    private function formatSuggestedLawyers($lawyers): array
    {
        if ($lawyers->isEmpty()) {
            return [];
        }
        return $lawyers->map(fn($l) => [
            'id' => (int) $l->lawyerid,
            'fullname' => $l->fullname ?? '',
            'profile_url' => '/lawyers/' . $l->lawyerid,
        ])->values()->all();
    }

    private function extractKeywords(string $question): array
    {
    $str = mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $question));

    $stopWords = [
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
        'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'what', 
        'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'please', 'tell', 'want', 
        'know', 'like', 'just', 'about', 'and', 'or', 'but', 'if', 'then',

        'là', 'và', 'của', 'cho', 'các', 'những', 'có', 'không', 'được', 'trong', 'với', 'tại', 
        'theo', 'để', 'từ', 'này', 'kia', 'đó', 'thế', 'ra', 'vào', 'lên', 'xuống', 'lại', 'qua', 
        'mới', 'còn', 'như', 'khi', 'nào', 'vậy', 'nhé', 'nha', 'đâu', 'cái', 'chiếc', 'sự', 'việc',

        'luật', 'luật sư', 'lawyer', 'law', 'giá', 'phí', 'tiền', 'bao', 'nhiêu', 'nhiều', 
        'hỏi', 'xin', 'cho', 'biết', 'cách', 'làm', 'sao', 'price', 'cost', 'fee', 'how', 'much'
    ];

    $words = array_filter(preg_split('/\s+/', $str), function ($w) use ($stopWords) {
        return !in_array($w, $stopWords) && mb_strlen($w) >= 2;
    });

    return array_values(array_slice(array_unique($words), 0, 10));
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

    /**
     * Sanitize lawyer links in AI answer: when stripAll true, remove all markdown links to /lawyers/id (frontend uses suggested_lawyers).
     * When stripAll false, validate each /lawyers/{id}; remove or replace invalid IDs so only verified lawyers remain.
     */
    private function sanitizeLawyerLinksInAnswer(string $answer, bool $stripAll = false): string
    {
        if ($stripAll) {
            return preg_replace_callback('/\[([^\]]*)\]\(\s*\/lawyers\/\d+\s*\)/u', fn($m) => $m[1], $answer);
        }
        preg_match_all('/\/lawyers\/(\d+)/', $answer, $matches);
        $ids = array_unique($matches[1] ?? []);
        $invalidIds = [];
        foreach ($ids as $id) {
            $valid = LawyerProfile::where('lawyerid', (int) $id)->where('isverified', true)->exists();
            if (!$valid) {
                $invalidIds[] = $id;
            }
        }
        if (empty($invalidIds)) {
            return $answer;
        }
        foreach ($invalidIds as $id) {
            $answer = preg_replace('/\[([^\]]*)\]\(\s*\/lawyers\/' . preg_quote($id, '/') . '\s*\)/u', '$1 (no longer in our system)', $answer);
            $answer = preg_replace('/\/lawyers\/' . preg_quote($id, '/') . '\b/u', '(no longer in our system)', $answer);
        }
        return $answer;
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
            'temperature' => 0.3,
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
