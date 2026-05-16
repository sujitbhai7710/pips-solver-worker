
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ============================================================
// TYPES
// ============================================================

type Bindings = {
    DB: D1Database;
    SECRET_KEY: string;
    GEMINI_API_KEYS: string;
    GITHUB_TOKEN: string;
    GITHUB_OWNER: string;
    GITHUB_REPO: string;
    GITHUB_BRANCH: string;
    GITHUB_PATH: string;
    CORS_ORIGINS?: string;
};

interface Region {
    indices: number[][];
    type: 'sum' | 'equals' | 'unequal' | 'less' | 'greater' | 'empty';
    target?: number;
}

interface DifficultyPuzzle {
    id: number;
    backendId: string;
    constructors: string;
    dominoes: number[][];
    regions: Region[];
    solution: number[][][];
}

interface NYTPuzzle {
    printDate: string;
    editor: string;
    easy: DifficultyPuzzle;
    medium: DifficultyPuzzle;
    hard: DifficultyPuzzle;
}

interface AIExplanation {
    easy: { heading: string; body: string };
    medium: { heading: string; body: string };
    hard: { heading: string; body: string };
    tips: string;
    learned: string;
    faqs: { question: string; answer: string }[];
}

// ============================================================
// CONSTANTS — E-E-A-T + HUMAN WRITING SEO PROMPT
// ============================================================

const AI_SYSTEM_PROMPT = `You are Alex Chen, a puzzle enthusiast and daily hints writer at Pips Solver. You've been solving NYT puzzles — crosswords, Connections, Strands, and now Pips — for over 8 years. You write like you're explaining to a friend who's stuck on a puzzle, not lecturing a classroom.

TODAY'S PUZZLE DATA FOR {DATE}:
{PUZZLE_DATA}

== IDENTITY & VOICE ==
You are writing as Alex Chen, a real person who actually solved today's puzzle. Your writing must sound like a human, not an AI assistant. This is critical for both reader trust and search quality.

== E-E-A-T SIGNALS (MANDATORY) ==
Every piece you write MUST demonstrate:
- EXPERIENCE: Use first-person narrative throughout. "I solved this puzzle this morning over coffee." "When I hit the region with the sum constraint of 8, I had to rethink my whole approach." Reference specific moments from your solving process that only someone who worked through it would mention.
- EXPERTISE: Use precise puzzle terminology correctly — domino orientation, region constraints (sum, equals, unequal, less-than, greater-than), cell positions (row, column), domino values like [3,5]. Explain WHY a strategy works, not just WHAT to do.
- AUTHORITATIVENESS: Write with confident, specific language. No hedging. "The key insight is..." not "You might want to consider..." Reference patterns you've noticed across multiple days of solving.
- TRUSTWORTHINESS: Be honest about difficulty. If the easy puzzle was trickier than usual, say so. If you made a mistake and had to backtrack, mention it. Honest accounts build more trust than polished perfection.

== HUMAN WRITING RULES (ANTI-AI-DETECTION) ==

DO NOT USE (these are AI telltales):
- "We're thrilled to announce" / "Excited to share" / "Delighted to introduce" — just start talking
- "Leveraging" / "cutting-edge" / "revolutionary" / "game-changing" / "unlock" — use plain words
- "It's important to note" / "Furthermore" / "Additionally" / "In conclusion" — cut these entirely
- "Let's dive in" / "Without further ado" / "At the end of the day" — delete and just continue
- Generic numbered lists with vague items like "Enhanced productivity, Improved efficiency"
- Any sentence that could appear verbatim on a corporate blog
- Exclamation points after every sentence
- Hedging phrases: "This might help you potentially..." / "You could possibly consider..."

DO USE (these sound human):
- Specific details: "The region in the top-right corner with sum=11 took me three tries" not "Some regions were challenging"
- Direct, confident language: "Start with the domino [3,5]" not "You might want to consider starting with the domino [3,5]"
- Honest limitations: "I got stuck on the equals region for a good two minutes before I realized I was reading the grid wrong"
- Conversational asides: "Turns out, the easiest path was through the hardest-looking region" / "I tried the obvious move first. It didn't work."
- Active voice, present tense: "I placed [2,4] vertically in column 3" not "The domino [2,4] was placed vertically"
- Varied sentence structure: Mix short punchy sentences with longer explanatory ones
- Contractions: "I didn't" / "That's" / "It's" / "I've" — natural speech uses contractions
- Mild opinions: "This was a tricky one" / "Loved the way the sum constraints interlocked" / "Frustrating but satisfying"
- Imperfect human touches: occasional hedging ("I think the best move is..."), uncertainty ("Could be [2,5], but [3,4] fits better because...")

== CONTENT STRUCTURE ==
Write your analysis as JSON with this EXACT structure:

{
  "easy": {
    "heading": "A unique creative heading — NOT 'Easy Puzzle'. Try personality: 'Starting Simple and Finding My Rhythm', 'The Warm-Up Had a Sneaky Twist', 'Morning Coffee and Domino Logic', etc.",
    "body": "3-5 paragraphs (minimum 200 words total). Write as a walkthrough of your solving process. Paragraph 1: How you approached it, what you noticed first. Paragraph 2: The key moves and which constraints guided you — reference specific cell positions like 'row 2, column 3' and domino values like [3,5]. Paragraph 3: Any tricky spots, mistakes you made, or satisfying aha moments. Be specific and personal. Add more paragraphs if the puzzle had interesting moments worth discussing."
  },
  "medium": {
    "heading": "A unique creative heading — different style from the easy one. Try: 'Things Got Interesting Fast', 'The Difficulty Jump Was Real', 'When Dominoes Don't Cooperate', etc.",
    "body": "3-5 paragraphs (minimum 200 words total). What made it harder than easy? Which regions stumped you? How did you work through the harder constraints? Reference specific domino placements and constraint interactions. Mention any dead-end paths you tried before finding the right one."
  },
  "hard": {
    "heading": "A unique creative heading — try: 'The One That Made Me Think Twice', 'Hard Mode Earned Its Name Today', 'When Logic Meets Patience', etc.",
    "body": "3-5 paragraphs (minimum 200 words total). Describe the biggest challenges, the moment you almost gave up, and the breakthrough. What strategy finally cracked it? How does this compare to other hard puzzles you've solved? Be honest if it took you a while."
  },
  "tips": "2-4 practical solving tips in 1-2 conversational paragraphs. Not generic — give advice that applies to today's specific puzzle structure. 'When you see a region with a sum constraint less than 5, start there — fewer domino combinations to check.'",
  "learned": "What you learned from today's puzzles — specific patterns, surprising moves, or general insights. 1-2 paragraphs. This should be original analysis, not generic puzzle advice.",
  "faqs": [
    {
      "question": "Write the exact question a frustrated player would Google at 7am. Use natural phrasing: 'How do you solve the NYT Pips puzzle for today?' / 'What are the NYT Pips answers for {DATE}?' / 'NYT Pips hints {DATE} — where do I start?'",
      "answer": "A genuinely helpful, detailed answer. Not just the answer — explain the reasoning. 2-3 sentences minimum per FAQ."
    }
  ]
}

== FAQ REQUIREMENTS ==
Write 5-7 FAQs. Mix these types:
- 2-3 "How do I..." process questions (solving strategies)
- 1-2 "What are the answers for..." direct questions (be helpful but explain reasoning)
- 1-2 "What does [X constraint] mean..." educational questions
- 1 "Is today's NYT Pips hard?" difficulty assessment question

Each FAQ question should use the exact phrasing a real person would type into Google. Natural, imperfect, sometimes including the date.

== KEYWORD PLACEMENT (SEO) ==
Naturally incorporate these phrases at least once across your writing:
- "NYT Pips hints" / "NYT Pips answers for {DATE}" / "Pips puzzle today" / "NYT Pips {DATE}"
- Do NOT stuff keywords — use them where they fit naturally in conversation
- The heading for each difficulty should ideally include a variant like "hints" or "answers" or "today" in a natural way

== STRICT OUTPUT RULES ==
- Return ONLY valid JSON. No markdown code fences, no extra text before or after.
- No markdown formatting inside string values — no **, no ##, no bullet points, no backticks.
- Each heading must be completely unique — never reuse a heading pattern across difficulties.
- Minimum 200 words per difficulty body. Total output should be 800-1500 words across all sections.
- Every claim about the puzzle must reference specific data — domino values, cell positions, constraint types and targets.
`;

// ============================================================
// APP SETUP
// ============================================================

const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS configuration
app.use('*', cors({
    origin: (origin, c) => {
        const allowed = (c.env.CORS_ORIGINS || 'https://pipsanswer.online,https://pipsanswer.vercel.app').split(',').map((s: string) => s.trim());
        // Also allow Cloudflare Pages previews
        if (origin && (allowed.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.vercel.app'))) {
            return origin;
        }
        return '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(JSON.stringify({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration,
        ip: c.req.header('CF-Connecting-IP') || 'unknown',
    }));
});

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function getDateInZone(offsetDays: number = 0, timeZone: string = 'Pacific/Kiritimati'): string {
    const date = new Date();
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone }));
    targetDate.setDate(targetDate.getDate() + offsetDays);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeDate(d: string): string {
    return d.trim().replace(/\/$/, '');
}

function validateDate(dateStr: string): { valid: boolean; error?: string } {
    const normalized = normalizeDate(dateStr);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD.' };
    }
    const date = new Date(normalized + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date value.' };
    }
    if (date < new Date('2024-01-01') || date > new Date(Date.now() + 7 * 86400000)) {
        return { valid: false, error: 'Date out of valid range.' };
    }
    return { valid: true };
}

function escapeLikePattern(str: string): string {
    return str.replace(/[%_\\]/g, '\\$&');
}

function authenticate(c: any): boolean {
    // Check Authorization header first
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
        const key = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (key === c.env.SECRET_KEY) return true;
    }
    return false;
}

// Format response with option to strip solutions and backendId
function formatResponse(row: any, includeSolutions: boolean = true): any {
    if (!row) return null;
    const data = JSON.parse(row.data);
    let explanation = null;
    try {
        if (row.explanation) {
            explanation = JSON.parse(row.explanation);
        }
    } catch {
        explanation = row.explanation;
    }

    const result: any = {
        printDate: data.printDate,
        editor: data.editor,
    };

    for (const difficulty of ['easy', 'medium', 'hard']) {
        if (data[difficulty]) {
            const puzzle = { ...data[difficulty] };
            if (!includeSolutions) {
                delete puzzle.solution;
                delete puzzle.backendId;
            }
            result[difficulty] = puzzle;
        }
    }

    result.explanation = explanation;
    return result;
}

// ============================================================
// GITHUB HELPER
// ============================================================

async function pushToGitHub(content: string, env: Bindings, message: string): Promise<boolean> {
    if (!env.GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN is missing.');
        return false;
    }

    const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.GITHUB_PATH}`;
    const headers = {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker'
    };

    try {
        // Get current SHA
        let sha = '';
        const getRes = await fetch(url, { headers });
        if (getRes.ok) {
            const getData = await getRes.json() as any;
            sha = getData.sha;
        }

        // Encode content as base64
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        let binary = '';
        for (let i = 0; i < data.byteLength; i++) {
            binary += String.fromCharCode(data[i]);
        }
        const base64Content = btoa(binary);

        const body: any = {
            message,
            content: base64Content,
            branch: env.GITHUB_BRANCH
        };
        if (sha) body.sha = sha;

        const putRes = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const err = await putRes.text();
            console.error('GitHub Push Error:', err);
            return false;
        }

        console.log('GitHub Push Success');
        return true;
    } catch (e) {
        console.error('GitHub Helper Exception:', e);
        return false;
    }
}

// ============================================================
// AI EXPLANATION GENERATION (single unified function)
// ============================================================

type KeyStrategy = 'random' | 'round-robin';

async function generateAIExplanation(
    data: any,
    env: Bindings,
    strategy: KeyStrategy = 'round-robin'
): Promise<string | null> {
    if (!env.GEMINI_API_KEYS) {
        console.error('GEMINI_API_KEYS secret is missing.');
        return null;
    }

    const keys = env.GEMINI_API_KEYS
        .split(/[\n,]+/)
        .map(k => k.trim().replace(/^["']|["']$/g, ''))
        .filter(k => k.length > 5);

    if (keys.length === 0) {
        console.error('No valid Gemini API keys found.');
        return null;
    }

    // Determine key order based on strategy
    let keyOrder: number[];
    if (strategy === 'random') {
        keyOrder = [...Array(keys.length).keys()];
        // Fisher-Yates shuffle
        for (let i = keyOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [keyOrder[i], keyOrder[j]] = [keyOrder[j], keyOrder[i]];
        }
    } else {
        const startIndex = Date.now() % keys.length;
        keyOrder = Array.from({ length: keys.length }, (_, i) => (startIndex + i) % keys.length);
    }

    // Build the prompt with date and puzzle data
    const prompt = AI_SYSTEM_PROMPT
        .replace('{DATE}', data.printDate || 'today')
        .replace('{PUZZLE_DATA}', JSON.stringify(data));

    for (const keyIndex of keyOrder) {
        const apiKey = keys[keyIndex];
        try {
            console.log(`Attempting Gemini generation with key ending in ...${apiKey.slice(-4)}`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.85,
                            maxOutputTokens: 4096,
                        }
                    })
                }
            );

            if (response.ok) {
                const result = await response.json() as any;
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    // Clean markdown fences if present
                    const cleaned = text.replace(/```json\n?|```/g, '').trim();
                    // Validate it's parseable JSON
                    try {
                        JSON.parse(cleaned);
                        return cleaned;
                    } catch {
                        console.warn('Gemini returned non-JSON response, skipping.');
                        continue;
                    }
                }
                console.warn('Gemini returned 200 but no text.');
                continue;
            } else {
                if (response.status === 429) {
                    console.warn(`Key ...${apiKey.slice(-4)} rate limited, trying next.`);
                    continue;
                }
                const errBody = await response.text().catch(() => '');
                console.error(`Gemini API Error ${response.status}: ${errBody.slice(0, 200)}`);
                if (response.status >= 500) continue;
                // 4xx other than 429 — probably bad request, don't retry same prompt
                break;
            }
        } catch (e) {
            console.error('Gemini Network Error:', e);
            continue;
        }
    }

    console.error('All Gemini API keys failed');
    return null;
}

// ============================================================
// DATABASE HELPERS
// ============================================================

async function addDateToDatabase(date: string, env: Bindings, keyIndex: number = 0): Promise<{ success: boolean; message: string }> {
    try {
        const normalizedDate = normalizeDate(date);

        // Validate date
        const validation = validateDate(normalizedDate);
        if (!validation.valid) {
            return { success: false, message: validation.error! };
        }

        // Check if date already exists
        const existing = await env.DB.prepare('SELECT 1 FROM pips WHERE date = ?').bind(normalizedDate).first();
        if (existing) {
            return { success: true, message: `Date ${normalizedDate} already exists, skipping.` };
        }

        // Fetch from NYT API
        const response = await fetch(`https://www.nytimes.com/svc/pips/v1/${normalizedDate}.json`);
        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, message: `Puzzle for ${normalizedDate} not published yet (NYT returned 404).` };
            }
            return { success: false, message: `Failed to fetch NYT data for ${normalizedDate}: ${response.status}` };
        }

        const data = await response.json() as any;

        // Validate NYT data structure
        if (!data.easy || !data.medium || !data.hard) {
            return { success: false, message: `NYT data for ${normalizedDate} is missing difficulty levels.` };
        }

        // Extract editor and constructors
        const editor = data.editor || '';
        const constructorsSet = new Set<string>();
        ['easy', 'medium', 'hard'].forEach(diff => {
            if (data[diff] && data[diff].constructors) {
                constructorsSet.add(data[diff].constructors);
            }
        });
        const constructors = Array.from(constructorsSet).join(', ');

        // Generate AI explanation
        const strategy: KeyStrategy = keyIndex > 0 ? 'round-robin' : 'random';
        const explanation = await generateAIExplanation(data, env, strategy);
        if (!explanation) {
            return { success: false, message: `Failed to generate AI explanation for ${normalizedDate} - all keys exhausted.` };
        }

        // Insert into database
        await env.DB.prepare(
            `INSERT OR REPLACE INTO pips (date, data, editor, constructors, explanation) VALUES (?, ?, ?, ?, ?)`
        ).bind(normalizedDate, JSON.stringify(data), editor, constructors, explanation).run();

        return { success: true, message: `Successfully added ${normalizedDate} with AI explanation.` };
    } catch (e: any) {
        return { success: false, message: `Error processing ${date}: ${e.message}` };
    }
}

// ============================================================
// PUBLIC API ROUTES
// ============================================================

// Health check with dependency status
app.get('/health', async (c) => {
    const checks: Record<string, { status: string; latency?: number; detail?: string }> = {};

    // Check D1
    const d1Start = Date.now();
    try {
        await c.env.DB.prepare('SELECT 1').first();
        checks.database = { status: 'ok', latency: Date.now() - d1Start };
    } catch {
        checks.database = { status: 'error' };
    }

    // Check Gemini API keys exist
    const keys = c.env.GEMINI_API_KEYS?.split(/[\n,]+/).filter(k => k.trim().length > 5) || [];
    checks.gemini = { status: keys.length > 0 ? 'ok' : 'error', detail: `${keys.length} keys configured` };

    // Check GitHub token
    checks.github = { status: c.env.GITHUB_TOKEN ? 'ok' : 'error' };

    const allOk = Object.values(checks).every(c => c.status === 'ok');

    return c.json({
        status: allOk ? 'healthy' : 'degraded',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        checks,
    }, allOk ? 200 : 503);
});

// Root
app.get('/', (c) => c.json({
    name: 'Pips Solver Worker API',
    version: '2.0.0',
    endpoints: {
        public: ['/today', '/yesterday', '/date/:date', '/date/:date/:difficulty', '/id/:id', '/list', '/archive', '/stats', '/pips/unlimited', '/search/region/:type', '/constructor/:name', '/editor/:name', '/health'],
        admin: ['/add/:date', '/delete/:date', '/trigger-cron']
    }
}));

// Today's puzzle (solutions stripped for public)
app.get('/today', async (c) => {
    const date = getDateInZone(0);
    const includeSolutions = c.req.query('solutions') === 'true' && authenticate(c);
    c.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    const result = await c.env.DB.prepare('SELECT data, explanation FROM pips WHERE date = ?').bind(date).first();
    if (!result) return c.json({ error: `Not found for today (${date})` }, 404);
    return c.json(formatResponse(result, includeSolutions));
});

// Yesterday's puzzle
app.get('/yesterday', async (c) => {
    const date = getDateInZone(-1);
    const includeSolutions = c.req.query('solutions') === 'true' && authenticate(c);
    c.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    const result = await c.env.DB.prepare('SELECT data, explanation FROM pips WHERE date = ?').bind(date).first();
    if (!result) return c.json({ error: `Not found for yesterday (${date})` }, 404);
    return c.json(formatResponse(result, includeSolutions));
});

// Specific date puzzle
app.get('/date/:date', async (c) => {
    const date = normalizeDate(c.req.param('date'));
    const validation = validateDate(date);
    if (!validation.valid) return c.json({ error: validation.error }, 400);

    const includeSolutions = c.req.query('solutions') === 'true' && authenticate(c);
    c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    const result = await c.env.DB.prepare('SELECT data, explanation FROM pips WHERE date = ?').bind(date).first();
    if (!result) return c.json({ error: `Not found for date: ${date}` }, 404);
    return c.json(formatResponse(result, includeSolutions));
});

// Specific date + difficulty
app.get('/date/:date/:difficulty', async (c) => {
    const date = normalizeDate(c.req.param('date'));
    const difficulty = c.req.param('difficulty');

    const validation = validateDate(date);
    if (!validation.valid) return c.json({ error: validation.error }, 400);

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return c.json({ error: 'Invalid difficulty. Must be easy, medium, or hard.' }, 400);
    }

    const includeSolutions = c.req.query('solutions') === 'true' && authenticate(c);
    const result = await c.env.DB.prepare('SELECT data, explanation FROM pips WHERE date = ?').bind(date).first();
    if (!result) return c.json({ error: `Not found for date: ${date}` }, 404);

    const fullData = formatResponse(result, includeSolutions);
    if (!fullData[difficulty]) {
        return c.json({ error: `Difficulty ${difficulty} not found for ${date}` }, 404);
    }

    // Scope explanation to requested difficulty only
    let scopedExplanation = null;
    if (fullData.explanation) {
        scopedExplanation = {
            [difficulty]: fullData.explanation[difficulty] || null,
            tips: fullData.explanation.tips || null,
            learned: fullData.explanation.learned || null,
            faqs: fullData.explanation.faqs || [],
        };
    }

    c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    return c.json({
        date: fullData.printDate,
        editor: fullData.editor,
        [difficulty]: fullData[difficulty],
        explanation: scopedExplanation,
    });
});

// Find by NYT ID
app.get('/id/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid ID. Must be a positive integer.' }, 400);

    const includeSolutions = c.req.query('solutions') === 'true' && authenticate(c);
    const query = `
        SELECT date, data, explanation FROM pips
        WHERE json_extract(data, '$.easy.id') = ?
           OR json_extract(data, '$.medium.id') = ?
           OR json_extract(data, '$.hard.id') = ?
        LIMIT 1
    `;

    const result = await c.env.DB.prepare(query).bind(id, id, id).first();
    if (!result) return c.json({ error: 'Puzzle ID not found' }, 404);

    const formatted = formatResponse(result, includeSolutions);

    let puzzle = null;
    let difficulty = '';
    if (formatted.easy?.id === id) { puzzle = formatted.easy; difficulty = 'easy'; }
    else if (formatted.medium?.id === id) { puzzle = formatted.medium; difficulty = 'medium'; }
    else if (formatted.hard?.id === id) { puzzle = formatted.hard; difficulty = 'hard'; }

    return c.json({
        date: result.date,
        difficulty,
        puzzle,
        explanation: formatted.explanation,
    });
});

// List puzzles (paginated, solutions stripped, with metadata)
app.get('/list', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20')), 100);
    const includeExplanation = c.req.query('include')?.includes('explanation');
    const offset = (page - 1) * limit;
    const today = getDateInZone(0);

    const selectCols = includeExplanation ? 'date, data, explanation' : 'date, data';

    const { results } = await c.env.DB.prepare(
        `SELECT ${selectCols} FROM pips WHERE date <= ? ORDER BY date DESC LIMIT ? OFFSET ?`
    ).bind(today, limit, offset).all();

    if (!results) return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });

    const formatted = results.map((r: any) => {
        const resp = formatResponse(r, false);
        if (!includeExplanation) {
            delete resp.explanation;
        }
        return { date: r.date, data: resp };
    });

    // Get total count
    const totalResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM pips WHERE date <= ?').bind(today).first();

    c.header('Cache-Control', 'public, max-age=300, s-maxage=300');
    return c.json({
        data: formatted,
        pagination: {
            page,
            limit,
            total: (totalResult as any)?.count || 0,
            totalPages: Math.ceil(((totalResult as any)?.count || 0) / limit),
        }
    });
});

// Archive endpoint (for calendar view)
app.get('/archive', async (c) => {
    const month = c.req.query('month'); // Format: YYYY-MM
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');

    let query = 'SELECT date, data FROM pips';
    const params: string[] = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
        query += ' WHERE date LIKE ?';
        params.push(`${month}%`);
    } else if (startDate && endDate) {
        query += ' WHERE date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY date ASC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    const dates = (results || []).map((row: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(row.data); } catch {}
        return {
            date: row.date,
            editor: parsed.editor || null,
            hasEasy: !!parsed.easy,
            hasMedium: !!parsed.medium,
            hasHard: !!parsed.hard,
        };
    });

    c.header('Cache-Control', 'public, max-age=600, s-maxage=600');
    return c.json({ dates, total: dates.length });
});

// Stats endpoint
app.get('/stats', async (c) => {
    // Total puzzles
    const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM pips').first();

    // Date range
    const dateRange = await c.env.DB.prepare(
        'SELECT MIN(date) as firstDate, MAX(date) as lastDate FROM pips'
    ).first();

    // Unique editors
    const editors = await c.env.DB.prepare(
        `SELECT editor, COUNT(*) as count FROM pips WHERE editor IS NOT NULL AND editor != '' GROUP BY editor ORDER BY count DESC LIMIT 20`
    ).all();

    // Unique constructors
    const constructors = await c.env.DB.prepare(
        `SELECT constructors, COUNT(*) as count FROM pips WHERE constructors IS NOT NULL AND constructors != '' GROUP BY constructors ORDER BY count DESC LIMIT 20`
    ).all();

    // Region type distribution using LIKE (D1 compatible)
    const regionTypes: Record<string, number> = {};
    for (const rType of ['sum', 'equals', 'unequal', 'less', 'greater', 'empty']) {
        const escaped = escapeLikePattern(rType);
        const result = await c.env.DB.prepare(
            `SELECT COUNT(*) as count FROM pips WHERE data LIKE ? ESCAPE '\\'`
        ).bind(`%"type":"${escaped}"%`).first();
        regionTypes[rType] = (result as any)?.count || 0;
    }

    // Difficulty ID range
    const easyRange = await c.env.DB.prepare(
        `SELECT MIN(json_extract(data, '$.easy.id')) as minId, MAX(json_extract(data, '$.easy.id')) as maxId FROM pips`
    ).first();

    // Recent additions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const recentCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM pips WHERE date >= ?'
    ).bind(sevenDaysAgo).first();

    c.header('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    return c.json({
        totalPuzzles: (total as any)?.count || 0,
        dateRange: {
            first: (dateRange as any)?.firstDate || null,
            last: (dateRange as any)?.lastDate || null,
        },
        editors: editors.results || [],
        topConstructors: constructors.results || [],
        regionTypeDistribution: regionTypes,
        idRange: {
            min: (easyRange as any)?.minId || null,
            max: (easyRange as any)?.maxId || null,
        },
        recentAdditions: {
            last7Days: (recentCount as any)?.count || 0,
        },
    });
});

// Random/unlimited puzzle
app.get('/pips/unlimited', async (c) => {
    const difficulty = c.req.query('difficulty') || '';
    const exclude = c.req.query('exclude'); // Comma-separated dates

    let query = 'SELECT date, data, explanation FROM pips';
    const params: string[] = [];

    if (exclude) {
        const excludedDates = exclude.split(',').map(d => d.trim()).filter(Boolean).slice(0, 50);
        if (excludedDates.length > 0) {
            const placeholders = excludedDates.map(() => '?').join(',');
            query += ` WHERE date NOT IN (${placeholders})`;
            params.push(...excludedDates);
        }
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const result = await c.env.DB.prepare(query).bind(...params).first();
    if (!result) return c.json({ error: 'No puzzles available' }, 404);

    const formatted = formatResponse(result, false);

    // If a specific difficulty is requested, return only that
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        return c.json({
            date: result.date,
            [difficulty]: formatted[difficulty],
            explanation: {
                [difficulty]: formatted.explanation?.[difficulty] || null,
                tips: formatted.explanation?.tips || null,
            }
        });
    }

    return c.json({ date: result.date, ...formatted });
});

// Search by region type (solutions stripped, LIKE escaped)
app.get('/search/region/:type', async (c) => {
    const type = c.req.param('type');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20')), 100);
    const offset = (page - 1) * limit;

    const escaped = escapeLikePattern(type);

    const { results } = await c.env.DB.prepare(
        `SELECT date, data, explanation FROM pips WHERE data LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT ? OFFSET ?`
    ).bind(`%"type":"${escaped}"%`, limit, offset).all();

    if (!results || results.length === 0) {
        // Try with space after colon
        const { results: resultsSpace } = await c.env.DB.prepare(
            `SELECT date, data, explanation FROM pips WHERE data LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT ? OFFSET ?`
        ).bind(`%"type": "${escaped}"%`, limit, offset).all();

        if (!resultsSpace || resultsSpace.length === 0) {
            return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }
        return c.json({
            data: resultsSpace.map((r: any) => ({ date: r.date, ...formatResponse(r, false) })),
            pagination: { page, limit, total: resultsSpace.length, totalPages: 1 },
        });
    }

    return c.json({
        data: results.map((r: any) => ({ date: r.date, ...formatResponse(r, false) })),
        pagination: { page, limit, total: results.length, totalPages: 1 },
    });
});

// Search by constructor name (solutions stripped, LIKE escaped)
app.get('/constructor/:name', async (c) => {
    const name = c.req.param('name');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20')), 100);
    const offset = (page - 1) * limit;

    const escaped = escapeLikePattern(name);

    const { results } = await c.env.DB.prepare(
        `SELECT date, data, explanation FROM pips WHERE constructors LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT ? OFFSET ?`
    ).bind(`%${escaped}%`, limit, offset).all();

    if (!results) return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    return c.json({
        data: results.map((r: any) => ({ date: r.date, ...formatResponse(r, false) })),
        pagination: { page, limit, total: results.length, totalPages: 1 },
    });
});

// Search by editor name (solutions stripped, LIKE escaped)
app.get('/editor/:name', async (c) => {
    const name = c.req.param('name');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20')), 100);
    const offset = (page - 1) * limit;

    const escaped = escapeLikePattern(name);

    const { results } = await c.env.DB.prepare(
        `SELECT date, data, explanation FROM pips WHERE editor LIKE ? ESCAPE '\\' ORDER BY date DESC LIMIT ? OFFSET ?`
    ).bind(`%${escaped}%`, limit, offset).all();

    if (!results) return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    return c.json({
        data: results.map((r: any) => ({ date: r.date, ...formatResponse(r, false) })),
        pagination: { page, limit, total: results.length, totalPages: 1 },
    });
});

// ============================================================
// ADMIN ROUTES (protected)
// ============================================================

// Add puzzle for a date
app.get('/add/:date/:key', async (c) => {
    const date = normalizeDate(c.req.param('date'));
    const key = c.req.param('key');

    // Support both URL key and Authorization header
    if (key !== c.env.SECRET_KEY && !authenticate(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const validation = validateDate(date);
    if (!validation.valid) return c.json({ error: validation.error }, 400);

    try {
        const response = await fetch(`https://www.nytimes.com/svc/pips/v1/${date}.json`);
        if (!response.ok) {
            if (response.status === 404) {
                return c.json({ error: `Puzzle for ${date} not published yet.`, status: 404 }, 404);
            }
            return c.json({ error: 'Failed to fetch data from NYT', status: response.status }, 502);
        }
        const data = await response.json() as any;

        if (!data.easy || !data.medium || !data.hard) {
            return c.json({ error: 'NYT data is missing difficulty levels.' }, 502);
        }

        const editor = data.editor || '';
        const constructorsSet = new Set<string>();
        ['easy', 'medium', 'hard'].forEach(diff => {
            if (data[diff] && data[diff].constructors) {
                constructorsSet.add(data[diff].constructors);
            }
        });
        const constructors = Array.from(constructorsSet).join(', ');

        // Generate AI explanation
        let explanation = null;
        try {
            explanation = await generateAIExplanation(data, c.env, 'random');
        } catch (aiError) {
            console.error('AI Error:', aiError);
            return c.json({ error: 'Failed to generate AI explanation. Try again later.' }, 503);
        }

        if (!explanation) {
            return c.json({
                error: 'All Gemini API keys are rate limited or failed. Data not saved. Try again later.',
            }, 429);
        }

        await c.env.DB.prepare(
            `INSERT OR REPLACE INTO pips (date, data, editor, constructors, explanation) VALUES (?, ?, ?, ?, ?)`
        ).bind(date, JSON.stringify(data), editor, constructors, explanation).run();

        return c.json({
            success: true,
            date,
            message: 'Data added successfully with AI explanation',
            explanation_generated: true
        });
    } catch (e: any) {
        console.error('Handler Error:', e);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// Delete a puzzle
app.get('/delete/:date/:key', async (c) => {
    const date = normalizeDate(c.req.param('date'));
    const key = c.req.param('key');

    if (key !== c.env.SECRET_KEY && !authenticate(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const validation = validateDate(date);
    if (!validation.valid) return c.json({ error: validation.error }, 400);

    try {
        await c.env.DB.prepare('DELETE FROM pips WHERE date = ?').bind(date).run();
        return c.json({ success: true, date, message: 'Data deleted successfully' });
    } catch (e: any) {
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// Manual cron trigger
app.get('/trigger-cron/:key', async (c) => {
    const key = c.req.param('key');
    if (key !== c.env.SECRET_KEY && !authenticate(c)) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const mockEvent = { scheduledTime: Date.now(), cron: '0 0 * * *' } as ScheduledEvent;
    const mockCtx = { waitUntil: (p: Promise<any>) => { p.catch(e => console.error('waitUntil error:', e)); } } as ExecutionContext;

    await handleScheduled(mockEvent, c.env, mockCtx);
    return c.json({ success: true, message: 'Cron job triggered manually. Check logs for details.' });
});

// ============================================================
// SCHEDULED HANDLER (Cron)
// ============================================================

async function handleScheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    console.log('[Cron] Scheduled task started at', new Date().toISOString());

    try {
        // Get today's date in UTC+14
        const todayStr = getDateInZone(0);
        console.log(`[Cron] Today (UTC+14): ${todayStr}`);

        // 1. Ensure today's puzzle exists
        const todayResult = await addDateToDatabase(todayStr, env, 0);
        console.log(`[Cron] Today (${todayStr}): ${todayResult.message}`);

        // 2. Try tomorrow (only if today succeeded)
        if (todayResult.success) {
            const tomorrow = new Date(todayStr + 'T00:00:00Z');
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const tomorrowResult = await addDateToDatabase(tomorrowStr, env, 1);
            console.log(`[Cron] Tomorrow (${tomorrowStr}): ${tomorrowResult.message}`);
        }

        // 3. Also check if we have gaps — find any missing dates in the last 3 days
        for (let i = 2; i <= 3; i++) {
            const pastDate = getDateInZone(-i);
            const exists = await env.DB.prepare('SELECT 1 FROM pips WHERE date = ?').bind(pastDate).first();
            if (!exists) {
                console.log(`[Cron] Gap found: ${pastDate}. Attempting to fill.`);
                const gapResult = await addDateToDatabase(pastDate, env, i);
                console.log(`[Cron] Gap fill (${pastDate}): ${gapResult.message}`);
            }
        }

        // 4. Push today's data to GitHub for static rebuild
        try {
            const todayData = await env.DB.prepare('SELECT data, explanation FROM pips WHERE date = ?').bind(todayStr).first();
            if (todayData) {
                const formatted = formatResponse(todayData, true); // Include solutions in GitHub file
                await pushToGitHub(JSON.stringify(formatted, null, 2), env, `Daily Update: ${todayStr}`);
            } else {
                console.warn(`[Cron] No data for ${todayStr} to push to GitHub.`);
            }
        } catch (error) {
            console.error('[Cron] GitHub push failed:', error);
        }

        console.log('[Cron] Scheduled task completed.');
    } catch (e: any) {
        console.error('[Cron] Scheduled task failed:', e.message);
    }
}

// ============================================================
// EXPORT
// ============================================================

export default {
    fetch: app.fetch,
    scheduled: handleScheduled,
};
