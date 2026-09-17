/**
 * Cloudflare Pages Function: POST /api/analyze
 * Serverless document analysis for russh.work/back. One file per call.
 *
 * Content extraction for PDF/DOCX/image runs on Moonshot's files API. The
 * field pass is TYPED first: deterministic regex finds every figure in the
 * document, TypeSafe Jev picks which candidate answers each field (or NONE)
 * and scores the structure flags, the document class, and the injection
 * likelihood as probabilities, one request, well under a second. Kimi K3
 * prose extraction is the fallback when TYPESAFE_API_KEY is not set or the
 * typed call fails.
 *
 * Keys live in Cloudflare env vars (MOONSHOT_API_KEY, TYPESAFE_API_KEY),
 * never in the page or the repo. PASSCODE env var gates every call.
 */

import { buildTypedQuestions, interpretTypedAnswers, classifyDocument, AUTHORITY, SANITY } from '../../lib/jev-core.js';

const FIELDS = Object.keys(SANITY).concat(['address', 'cityState']);

const SYSTEM = `You extract commercial real estate deal facts from documents for an underwriting pipeline.
Rules:
- Only report values explicitly present in the text. Never estimate or infer. Omit absent fields.
- askingPrice is the purchase/asking price, NOT a loan amount. loanRequest is the debt requested. capexTotal is the renovation/PIP/capital budget.
- occupancy and capRate as decimals. Dollar amounts as plain numbers (18400000 for $18.4MM).
- Every field: { "value": number|string, "quote": "verbatim snippet under 80 chars", "confidence": 0-1 }.
- structureFlags: deal-structure red tape numbers cannot carry: position type (GP/LP vs fee simple), agency/regulatory approvals, LP consents, evictions/litigation, receivables, deferred fees, earnout/seller financing, regulatory agreements, compliance periods. Each: { "flag", "detail", "quote", "severity": "info"|"caution"|"serious" }.
Respond with one JSON object: { "fields": { <fieldName>: {...} }, "structureFlags": [...] }.
Field names allowed: ${FIELDS.join(', ')}.`;

const TEXT_EXT = ['md', 'txt', 'csv'];
const JEV_PRICE_PER_M_INPUT = 0.042; // USD; output tokens are free (typesafe.ai, 2026-09-15)
const K3_PRICE = { input: 0.8, output: 3.0 };

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function moonshotExtractFileText(env, name, bytes) {
  const fd = new FormData();
  fd.append('file', new File([bytes], name), name);
  fd.append('purpose', 'file-extract');
  const up = await fetch('https://api.moonshot.ai/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.MOONSHOT_API_KEY}` },
    body: fd,
  });
  const meta = await up.json();
  if (!up.ok || !meta.id) throw new Error(meta.error?.message || `file upload failed (${up.status})`);
  try {
    const res = await fetch(`https://api.moonshot.ai/v1/files/${meta.id}/content`, {
      headers: { Authorization: `Bearer ${env.MOONSHOT_API_KEY}` },
    });
    const raw = await res.text();
    try {
      const j = JSON.parse(raw);
      return j.content ?? j.text ?? raw;
    } catch {
      return raw;
    }
  } finally {
    // Best-effort cleanup so the account's file storage doesn't fill
    fetch(`https://api.moonshot.ai/v1/files/${meta.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.MOONSHOT_API_KEY}` },
    }).catch(() => {});
  }
}

async function k3Json(env, system, user, maxTokens) {
  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model: 'kimi-k3',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || 'model error');
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty completion');
  return { data: JSON.parse(content), usage: j.usage || {} };
}

/**
 * One typed request per document. 429 and 529 retry with backoff per the
 * TypeSafe API reference; anything else throws to the K3 fallback.
 */
async function jevAsk(env, state, questions) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.TYPESAFE_API_KEY}` },
      body: JSON.stringify({ model: 'jev-latest', state, questions }),
    });
    if (res.ok) {
      const j = await res.json();
      if (!j.answers) throw new Error('typed response carried no answers');
      return j;
    }
    lastErr = new Error(`typed model HTTP ${res.status}: ${(await res.text()).substring(0, 160)}`);
    if (res.status !== 429 && res.status !== 529) throw lastErr;
    await new Promise(r => setTimeout(r, 400 * 2 ** attempt));
  }
  throw lastErr;
}

async function typedAnalysis(env, doc, filename) {
  const set = buildTypedQuestions(doc, {});
  const t0 = Date.now();
  const j = await jevAsk(env, doc, set.questions);
  const out = interpretTypedAnswers(j.answers, set, doc, filename);
  const inputTokens = j.usage?.input_tokens || 0;
  return {
    ...out,
    engine: 'typed',
    model: j.model || 'jev-latest',
    latencyMs: Date.now() - t0,
    usage: { inputTokens, outputTokens: j.usage?.output_tokens || 0, estCostUsd: (inputTokens * JEV_PRICE_PER_M_INPUT) / 1e6 },
    candidates: set.candidates.length,
    askedFields: set.askedFields.length,
  };
}

async function proseAnalysis(env, doc, filename) {
  const t0 = Date.now();
  const out = await k3Json(env, SYSTEM, `Extract deal facts from this document:\n\n${doc}`, 3000);
  const fields = [];
  const rawFields = out.data.fields || {};
  for (const [name, hit] of Object.entries(rawFields)) {
    if (!FIELDS.includes(name) || !hit || hit.value === null || hit.value === undefined) continue;
    const range = SANITY[name];
    if (range && typeof hit.value === 'number' && (hit.value < range[0] || hit.value > range[1])) continue;
    fields.push({
      field: name,
      value: hit.value,
      confidence: Math.max(0.3, Math.min(0.85, Number(hit.confidence) || 0.6)),
      quote: String(hit.quote || '').substring(0, 90),
    });
  }
  const structureFlags = (out.data.structureFlags || [])
    .filter(f => f && f.flag && ['info', 'caution', 'serious'].includes(f.severity))
    .slice(0, 10)
    .map(f => ({ flag: String(f.flag), detail: String(f.detail || ''), quote: String(f.quote || '').substring(0, 90), severity: f.severity }));
  const cls = classifyDocument(filename, doc.substring(0, 4000));
  const inputTokens = out.usage.prompt_tokens || 0;
  const outputTokens = out.usage.completion_tokens || 0;
  return {
    fields,
    structureFlags,
    injectionProbability: null,
    docClass: { docClass: cls.docClass, authority: AUTHORITY[cls.docClass] || 10, why: cls.why, revised: false },
    engine: 'prose',
    model: 'kimi-k3',
    latencyMs: Date.now() - t0,
    usage: { inputTokens, outputTokens, estCostUsd: (inputTokens * K3_PRICE.input + outputTokens * K3_PRICE.output) / 1e6 },
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (code, obj) => new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

  if (!env.PASSCODE || !env.MOONSHOT_API_KEY) {
    return json(503, { error: 'Not configured. Set PASSCODE and MOONSHOT_API_KEY in Cloudflare Pages environment variables.' });
  }
  if (request.headers.get('x-pass') !== env.PASSCODE) {
    return json(401, { error: 'passcode required' });
  }

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad json' }); }
  const file = body.file;
  if (!file?.name || !file?.b64) return json(400, { error: 'file{name,b64} required' });

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  let text;
  try {
    if (TEXT_EXT.includes(ext)) {
      text = new TextDecoder().decode(b64ToBytes(file.b64));
    } else {
      text = await moonshotExtractFileText(env, file.name, b64ToBytes(file.b64));
    }
  } catch (e) {
    return json(422, { error: `content extraction failed: ${String(e.message).substring(0, 160)}` });
  }
  if (!text || text.trim().length < 20) {
    return json(200, { fields: [], structureFlags: [], note: 'no readable content' });
  }

  const doc = text.length > 60000 ? text.substring(0, 60000) : text;
  let result;
  let typedError = null;
  if (env.TYPESAFE_API_KEY && body.engine !== 'prose') {
    try {
      result = await typedAnalysis(env, doc, file.name);
    } catch (e) {
      typedError = String(e.message).substring(0, 160);
    }
  }
  if (!result) {
    try {
      result = await proseAnalysis(env, doc, file.name);
      if (typedError) result.fallbackFrom = typedError;
      else if (!env.TYPESAFE_API_KEY) result.note = 'typed model not configured (TYPESAFE_API_KEY); prose extraction';
    } catch (e) {
      return json(502, { error: `extraction failed: ${String(e.message).substring(0, 160)}${typedError ? ' (typed: ' + typedError + ')' : ''}` });
    }
  }
  return json(200, result);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-pass',
    },
  });
}
