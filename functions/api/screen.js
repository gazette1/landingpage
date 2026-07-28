/**
 * Cloudflare Pages Function: POST /api/screen
 * Deterministic doctrine screen: pure JS math, no model call. A port of the
 * mosaicagent screen core (market-indexed rates, kill criteria, owner-occupancy
 * routing, structural escalation) so the serverless flow renders an honest
 * verdict without the desk backend.
 */

// Market convention: refresh alongside config/market.json in the main repo
const MARKET = { index: 'SOFR', indexRate: 0.053, spreadBps: 400, stress: 0.0175, asOf: '2025-12-08' };
const LTV = 0.6;
const NOI_HAIRCUT = 0.10;

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (code, obj) => new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
  if (!env.PASSCODE) return json(503, { error: 'Not configured.' });
  if (request.headers.get('x-pass') !== env.PASSCODE) return json(401, { error: 'passcode required' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad json' }); }
  const fields = body.fields || [];
  const flags = body.structureFlags || [];
  const get = n => { const f = fields.find(x => x.field === n && typeof x.value === 'number'); return f ? f.value : null; };
  const conf = n => { const f = fields.find(x => x.field === n); return f ? f.confidence : null; };

  const price = get('askingPrice');
  const noi = get('noi');
  const capex = get('capexTotal');
  const allin = MARKET.indexRate + MARKET.spreadBps / 10000;
  const stressedRate = allin + MARKET.stress;

  const killFlags = [];
  const metrics = {};

  let entryCap = null, stressedDscr = null;
  if (noi !== null && price !== null && price > 0) {
    entryCap = noi / price;
    metrics.entryCap = { name: 'Entry Cap Rate', value: entryCap * 100, unit: '%', confidence: Math.min(conf('noi') ?? 0.5, conf('askingPrice') ?? 0.5) };
  }
  if (noi !== null && price !== null) {
    const loan = price * LTV;
    const ds = loan * stressedRate;
    stressedDscr = (noi * (1 - NOI_HAIRCUT)) / ds;
    metrics.stressedDscr = { name: 'Stressed DSCR', value: stressedDscr, unit: 'x', confidence: conf('noi') ?? 0.5 };
    metrics.ltv = { name: 'LTV (Proxy)', value: LTV * 100, unit: '%', confidence: 0.8 };
  }
  if (noi !== null) metrics.noi = { name: 'Net Operating Income', value: noi, unit: 'USD/year', confidence: conf('noi') ?? 0.5 };

  // Kill criteria (core of the doctrine)
  if (stressedDscr !== null) {
    killFlags.push({ criterion: 'No Margin for Error', severity: 'hard', triggered: stressedDscr < 1.15, reason: `Stressed DSCR ${stressedDscr.toFixed(2)}x vs 1.15x floor at ${MARKET.index}+${MARKET.spreadBps}bps stressed` });
  }
  const noiConf = conf('noi');
  killFlags.push({ criterion: 'Unclear/Unverifiable Income', severity: 'hard', triggered: noi === null || (noiConf !== null && noiConf < 0.5), reason: noi === null ? 'No NOI extracted from the document set' : `NOI confidence ${(noiConf * 100).toFixed(0)}%` });
  killFlags.push({ criterion: 'CapEx Cannot Be Priced', severity: 'soft', triggered: capex === null, reason: capex === null ? 'No capital budget in the document set' : 'Capital budget extracted' });
  const serious = flags.filter(f => f.severity === 'serious');
  if (serious.length > 0) {
    killFlags.push({ criterion: 'Structural Complexity', severity: 'soft', triggered: true, reason: `${serious.length} serious structure flag(s): ${serious.slice(0, 3).map(f => f.flag).join('; ')}` });
  }

  // Confidence proxy: mean of field confidences, damped by missing core inputs
  const confs = fields.map(f => f.confidence).filter(c => typeof c === 'number');
  let overall = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0.2;
  if (noi === null) overall *= 0.6;
  if (price === null) overall *= 0.7;
  overall = Math.max(0.05, Math.min(0.95, overall));

  // Verdict
  const hard = killFlags.filter(f => f.triggered && f.severity === 'hard');
  const soft = killFlags.filter(f => f.triggered && f.severity === 'soft');
  let verdict, riskScore, rationale;
  if (hard.length) { verdict = 'KILL'; riskScore = 5; rationale = `Hard kill: ${hard.map(f => f.criterion).join(', ')}`; }
  else if (soft.length >= 2) { verdict = 'STRUCTURE'; riskScore = 4; rationale = `Multiple soft concerns: ${soft.map(f => f.criterion).join(', ')}`; }
  else if (soft.length === 1) { verdict = 'CHASE'; riskScore = 3; rationale = `Single concern: ${soft[0].criterion}`; }
  else if (overall >= 0.7) { verdict = 'CHASE'; riskScore = overall >= 0.85 ? 2 : 3; rationale = 'No kill criteria; data quality supports underwriting'; }
  else { verdict = 'DELEGATE'; riskScore = 3; rationale = 'Insufficient verified data for a confident decision'; }

  // Owner-occupancy routing: no property NOI on an owner-occupied asset is a
  // guarantor question, not a kill
  const ownerOccupied = [...fields, ...flags].some(x => /owner[\s-]?occup/i.test(JSON.stringify(x)));
  if (verdict === 'KILL' && ownerOccupied && hard.length === 1 && hard[0].criterion === 'Unclear/Unverifiable Income') {
    verdict = 'DELEGATE'; riskScore = 3;
    rationale = 'Owner-occupied: income basis is the occupant/guarantor, outside asset scope. Route to guarantor analysis.';
  }
  // Structural escalation
  if (verdict === 'CHASE' && serious.length >= 3) {
    verdict = 'STRUCTURE'; riskScore = Math.max(riskScore, 4);
    rationale = `${serious.length} serious structure flags: transaction requires structuring and approvals. ` + rationale;
  }

  const mosaic = verdict === 'CHASE' ? 'PURSUE' : verdict === 'KILL' ? 'PASS' : 'MONITOR';

  return json(200, {
    verdict, riskScore, rationale, confidence: overall,
    mosaicVerdict: mosaic,
    killFlags: killFlags.filter(f => f.triggered).map(f => f.criterion),
    killFlagDetail: killFlags,
    metrics,
    market: `${MARKET.index} ${(MARKET.indexRate * 100).toFixed(2)}% + ${MARKET.spreadBps}bps (as of ${MARKET.asOf}; refresh before routing)`,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-pass' },
  });
}
