/**
 * Cloudflare Pages Function: POST /api/memo
 * K3 drafts the memo judgment sections from the aggregated analysis; this
 * function renders the full memo HTML. Verdict comes from /api/screen
 * (deterministic) translated to Mosaic vocabulary; the model writes prose only.
 */

const SYSTEM = `You draft the judgment-prose sections of an INTERNAL underwriting memorandum for Mosaic Capital Solutions.
Hard rules:
- Use ONLY the provided facts. Never invent a number.
- Financial figures in prose: M for thousands, MM for millions.
- Plain factual statements. No em-dashes. No exclamation points. No superlatives.
Respond with one JSON object: { "scenarioLine": string, "killTest": string, "criticalFindings": string[] (max 6, sharpest first, each with its number), "conditions": string[] (max 8, concrete with amounts/approvals), "alternativeStructures": string[] (max 4, only what the facts support) }.`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (code, obj) => new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
  if (!env.PASSCODE || !env.MOONSHOT_API_KEY) return json(503, { error: 'Not configured.' });
  if (request.headers.get('x-pass') !== env.PASSCODE) return json(401, { error: 'passcode required' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad json' }); }
  const { name, assetType, location, fields = [], structureFlags = [], screen = {} } = body;

  const facts = { name, assetType, location, fields, structureFlags, screen };
  let prose;
  try {
    const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.MOONSHOT_API_KEY}` },
      body: JSON.stringify({
        model: 'kimi-k3',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Draft the memo sections for this deal:\n${JSON.stringify(facts).substring(0, 40000)}` },
        ],
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });
    const j = await res.json();
    if (j.error) throw new Error(j.error.message);
    prose = JSON.parse(j.choices?.[0]?.message?.content || '{}');
  } catch (e) {
    return json(502, { error: `memo drafting failed: ${String(e.message).substring(0, 160)}` });
  }

  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const verdict = screen.mosaicVerdict || 'MONITOR';
  const vColor = verdict === 'PURSUE' ? '#2e7d32' : verdict === 'PASS' ? '#c62828' : '#b26a00';
  const date = new Date().toISOString().substring(0, 10);
  const serious = structureFlags.filter(f => f.severity === 'serious');
  const li = arr => (arr || []).map(x => `<li>${esc(x)}</li>`).join('');
  const usd = v => (typeof v === 'number' ? '$' + Math.round(v).toLocaleString() : esc(v));
  const fieldRows = fields.map(f => `<tr><td>${esc(f.field)}</td><td>${usd(f.value)}</td><td class="m">${(f.confidence ?? 0).toFixed(2)}</td><td class="m">${esc(f.quote)}</td></tr>`).join('');
  const flagRows = serious.map(f => `<tr><td>${esc(f.flag)}</td><td>${esc(f.detail)}</td></tr>`).join('');
  const redRows = (screen.killFlagDetail || []).map(f => `<tr><td>${esc(f.criterion)}</td><td>${f.triggered ? 'FLAGGED' : 'CLEAR'}</td><td>${esc(f.reason)}</td></tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} - Underwriting Memorandum (MACHINE DRAFT)</title>
<style>
 :root{--navy:#1a5c9e;--ink:#1c2733;--mid:#5b6b7c;--line:#d7dee6;--band:#eef3f8}
 body{font-family:'Segoe UI',system-ui,sans-serif;color:var(--ink);max-width:860px;margin:0 auto 5rem;padding:0 1.4rem;line-height:1.55}
 h1{font-size:1.4rem;color:#123f6d;border-bottom:3px solid var(--navy);padding-bottom:.5rem;margin-top:1.4rem}
 h2{font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:var(--navy);padding:.45rem .8rem;margin:1.6rem 0 .6rem}
 table{border-collapse:collapse;width:100%;font-size:.88rem;margin-bottom:.7rem}
 th{text-align:left;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mid);border-bottom:2px solid var(--navy);padding:.35rem .6rem}
 td{border-bottom:1px solid var(--line);padding:.4rem .6rem;vertical-align:top}
 tr td:first-child{font-weight:600}
 tbody tr:nth-child(even) td{background:var(--band)}
 .m{color:var(--mid);font-size:.8rem}
 .verdict{display:inline-block;color:#fff;background:${vColor};font-weight:700;letter-spacing:.1em;padding:.35rem 1.1rem;border-radius:3px;margin:.4rem 0}
 .ribbon{display:inline-block;font-weight:700;font-size:.72rem;letter-spacing:.12em;color:#fff;background:#e0b64a;padding:.25rem .9rem;border-radius:3px}
 ul{margin:.4rem 0 .6rem 1.2rem} li{margin:.25rem 0;font-size:.92rem}
 footer{font-size:.72rem;color:var(--mid);border-top:1px solid var(--line);padding-top:.7rem;margin-top:2rem;text-transform:uppercase;letter-spacing:.06em}
</style></head><body>
<div style="margin-top:1.2rem"><span class="ribbon">MACHINE DRAFT - ANALYST CONFIRMS OR OVERRIDES</span></div>
<h1>UNDERWRITING MEMORANDUM - ${esc(name)}</h1>
<p class="m">${esc(assetType || '').toUpperCase()} | ${esc(location || '')} | ${date} | serverless pipeline (extraction + doctrine screen; full model requires the desk backend)</p>
<h2>1. Executive Summary</h2>
<p><b>${esc(prose.scenarioLine || '')}</b></p>
<div class="verdict">VERDICT: ${verdict}</div>
<p class="m">${esc(screen.rationale || '')} | risk ${screen.riskScore ?? '?'}/5 | confidence ${Math.round((screen.confidence ?? 0) * 100)}% | ${esc(screen.market || '')}</p>
<p><b>Kill Test:</b> ${esc(prose.killTest || '')}</p>
<p><b>CRITICAL FINDINGS:</b></p><ul>${li(prose.criticalFindings)}</ul>
<h2>2. Serious Structure Flags</h2>
${flagRows ? `<table><thead><tr><th>Flag</th><th>Detail</th></tr></thead><tbody>${flagRows}</tbody></table>` : '<p class="m">None extracted.</p>'}
<h2>3. Extracted Facts</h2>
<table><thead><tr><th>Field</th><th>Value</th><th>Conf</th><th>Evidence</th></tr></thead><tbody>${fieldRows}</tbody></table>
<h2>4. Red Line Check</h2>
${redRows ? `<table><thead><tr><th>Criterion</th><th>Status</th><th>Reason</th></tr></thead><tbody>${redRows}</tbody></table>` : '<p class="m">Screen not run.</p>'}
<h2>5. Verdict & Conditions</h2>
<div class="verdict">VERDICT: ${verdict}</div>
<p><b>CONDITIONS FOR RECONSIDERATION:</b></p><ul>${li(prose.conditions)}</ul>
<p><b>ALTERNATIVE STRUCTURES PROPOSED:</b></p><ul>${li(prose.alternativeStructures)}</ul>
<footer>Mosaic Capital Solutions | ${date} | INTERNAL | MACHINE DRAFT (kimi-k3, serverless)</footer>
</body></html>`;

  return json(200, { html });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-pass' },
  });
}
