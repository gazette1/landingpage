/**
 * Cloudflare Pages Function: POST /api/qap
 * QAP Engine: retrieval-augmented Q&A over the LIHTC QAP corpus
 * (Maryland 2025 QAP, Maryland 2025 MRFP Guide, DC 2025 QAP).
 *
 * Pipeline per request:
 *   1. Validate + rate limit (per-IP, Cache API, no persistence needed).
 *   2. State routing: query naming an in-corpus state filters retrieval to
 *      it; a query naming only out-of-corpus states is refused honestly
 *      before any model call. Mirrors rag/eval_retrieval.py exactly.
 *   3. Embed the query (OpenAI text-embedding-3-small, 256 dims) and dot-
 *      product against the precomputed L2-normalized index served as a
 *      static asset. 505 chunks: in-memory search, no vector DB needed.
 *   4. Generate a cited answer (Kimi K3) constrained to the retrieved
 *      passages; the model is told to say when the sources do not answer.
 *
 * Keys live in Cloudflare env (OPENAI_API_KEY, MOONSHOT_API_KEY), never in
 * the page or repo. No passcode: public demo, rate-limited instead.
 */

const DIMS = 256;
const TOP_K = 6;
const SIM_FLOOR = 0.3; // gibberish floor; coverage refusals use state routing
const RATE_LIMIT = 15; // requests per IP per hour
const MAX_Q = 400;

const IN_CORPUS = {
  MD: ['maryland'],
  DC: ['district of columbia', 'washington dc', 'washington, dc', 'd.c.', 'dc'],
};
const OUT_STATES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
  'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota',
  'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
  'south carolina', 'south dakota', 'tennessee', 'texas', 'utah',
  'vermont', 'virginia', 'washington state', 'west virginia', 'wisconsin',
  'wyoming',
];

function detectStates(q) {
  const ql = ` ${q.toLowerCase()} `;
  const hitIn = Object.entries(IN_CORPUS)
    .filter(([, names]) => names.some((n) =>
      n.includes(' ') ? ql.includes(n) : ql.includes(` ${n} `) || ql.includes(` ${n}?`)))
    .map(([s]) => s);
  const hitOut = OUT_STATES.filter((s) => ql.includes(s));
  return { hitIn, hitOut };
}

// Module-scope index cache: survives across requests in a warm isolate.
let INDEX = null;

async function loadIndex(env, requestUrl) {
  if (INDEX) return INDEX;
  const base = new URL(requestUrl);
  const [chunksRes, vecsRes] = await Promise.all([
    env.ASSETS.fetch(new URL('/qap-engine/data/chunks.json', base)),
    env.ASSETS.fetch(new URL('/qap-engine/data/vectors.bin', base)),
  ]);
  if (!chunksRes.ok || !vecsRes.ok) throw new Error('index assets missing');
  const meta = await chunksRes.json();
  const buf = await vecsRes.arrayBuffer();
  INDEX = { chunks: meta.chunks, vectors: new Float32Array(buf) };
  return INDEX;
}

async function embedQuery(env, q) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', input: [q], dimensions: DIMS,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error?.message || `embed failed (${res.status})`);
  const v = j.data[0].embedding;
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

async function generate(env, question, hits) {
  const sources = hits.map((h, i) =>
    `[${i + 1}] ${h.title}, ${h.section ? h.section + ', ' : ''}page ${h.page_start}:\n${h.text}`)
    .join('\n\n');
  // Primary: Kimi K3 (key already provisioned for the other demos).
  // Fallback: gpt-4o-mini, so the demo degrades to a different model
  // instead of an error page, and local dev works with one key.
  if (env.MOONSHOT_API_KEY) {
    try {
      return await chatCall(env, 'https://api.moonshot.ai/v1/chat/completions',
        env.MOONSHOT_API_KEY, 'kimi-k3', 1, question, sources);
    } catch (e) { /* fall through to OpenAI */ }
  }
  return chatCall(env, 'https://api.openai.com/v1/chat/completions',
    env.OPENAI_API_KEY, 'gpt-4o-mini', 0, question, sources);
}

async function chatCall(env, url, key, model, temperature, question, sources) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content:
            'You answer questions about Low Income Housing Tax Credit Qualified Allocation Plans ' +
            'using ONLY the numbered source passages provided. Rules: ' +
            '1) Every factual claim carries a bracketed citation like [2]. ' +
            '2) If the passages do not answer the question, say exactly that and name what related material they do cover. Never fill gaps from general knowledge. ' +
            '3) Quote thresholds, percentages, and point values verbatim from the passages. ' +
            '4) Plain factual prose. No hype. No em-dashes. Under 250 words. ' +
            '5) These are planning documents; end with nothing resembling legal advice.',
        },
        { role: 'user', content: `Question: ${question}\n\nSource passages:\n\n${sources}` },
      ],
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'model error');
  const msg = j.choices?.[0]?.message || {};
  return (msg.content || msg.reasoning_content || '').trim();
}

async function rateLimited(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const cache = caches.default;
  const key = new Request(`https://qap-rl.internal/${ip}`);
  const hit = await cache.match(key);
  let count = 0;
  if (hit) count = parseInt(await hit.text(), 10) || 0;
  if (count >= RATE_LIMIT) return true;
  await cache.put(key, new Response(String(count + 1), {
    headers: { 'Cache-Control': 's-maxage=3600' },
  }));
  return false;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost({ request, env }) {
  try {
    const { question } = await request.json().catch(() => ({}));
    const q = (question || '').trim();
    if (q.length < 5 || q.length > MAX_Q) {
      return new Response(JSON.stringify({ error: `Question must be 5-${MAX_Q} characters.` }),
        { status: 400, headers: JSON_HEADERS });
    }
    if (await rateLimited(request)) {
      return new Response(JSON.stringify({ error: 'Rate limit reached (15/hour). Try again later.' }),
        { status: 429, headers: JSON_HEADERS });
    }

    const { hitIn, hitOut } = detectStates(q);
    if (hitOut.length && !hitIn.length) {
      return new Response(JSON.stringify({
        refused: true,
        answer: `This corpus covers the Maryland 2025 QAP, the Maryland 2025 MRFP Guide, and the DC 2025 QAP. It has no documents for ${hitOut.join(', ')}, so answering would mean guessing from the wrong state's plan. Ask about Maryland or DC.`,
        sources: [],
      }), { headers: JSON_HEADERS });
    }

    const { chunks, vectors } = await loadIndex(env, request.url);
    const qv = await embedQuery(env, q);

    const scored = [];
    for (let i = 0; i < chunks.length; i++) {
      if (hitIn.length && !hitIn.includes(chunks[i].state)) continue;
      let dot = 0;
      const off = i * DIMS;
      for (let d = 0; d < DIMS; d++) dot += qv[d] * vectors[off + d];
      scored.push([dot, i]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const top = scored.slice(0, TOP_K);

    if (!top.length || top[0][0] < SIM_FLOOR) {
      return new Response(JSON.stringify({
        refused: true,
        answer: 'Nothing in the corpus is a close match for that question. Try rephrasing it in QAP terms (set-asides, thresholds, evaluation criteria, fees, compliance).',
        sources: [],
      }), { headers: JSON_HEADERS });
    }

    const hits = top.map(([sim, i]) => ({ ...chunks[i], sim }));
    const answer = await generate(env, q, hits);

    return new Response(JSON.stringify({
      answer,
      stateFilter: hitIn,
      sources: hits.map((h, i) => ({
        n: i + 1, doc: h.title, state: h.state, section: h.section,
        pages: h.page_start === h.page_end ? `p. ${h.page_start}` : `pp. ${h.page_start}-${h.page_end}`,
        snippet: h.text.slice(0, 220), sim: Math.round(h.sim * 1000) / 1000,
      })),
    }), { headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 500, headers: JSON_HEADERS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
