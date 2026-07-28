/**
 * Cloudflare Pages Function: POST /api/analyze
 * Serverless document analysis for russh.work/back. One file per call.
 *
 * Heavy lifting is delegated: PDF/DOCX/image content extraction runs on
 * Moonshot's files API, field + structure-flag extraction on Kimi K3. The
 * key lives in Cloudflare env vars (MOONSHOT_API_KEY), never in the page
 * or the repo. PASSCODE env var gates every call.
 */

const SANITY = {
  askingPrice: [250000, 5000000000],
  noi: [25000, 500000000],
  capRate: [0.005, 0.25],
  occupancy: [0.01, 1.0],
  adr: [30, 2500],
  revpar: [5, 2000],
  keys: [10, 2500],
  totalUnits: [1, 10000],
  totalSF: [500, 50000000],
  yearBuilt: [1850, 2035],
  loanRequest: [250000, 5000000000],
  capexTotal: [10000, 2000000000],
};

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
  let out;
  try {
    out = await k3Json(env, SYSTEM, `Extract deal facts from this document:\n\n${doc}`, 3000);
  } catch (e) {
    return json(502, { error: `extraction failed: ${String(e.message).substring(0, 160)}` });
  }

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

  return json(200, {
    fields,
    structureFlags,
    usage: { inputTokens: out.usage.prompt_tokens || 0, outputTokens: out.usage.completion_tokens || 0 },
  });
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
