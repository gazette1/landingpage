// Server-side visit log for russh.work demo pages. Nothing runs in the page,
// no cookies are set, and no IP address is stored. Each record keeps the time,
// the short code or page, the visitor's country and network name as Cloudflare
// reports them, the browser string and the referring host, for 180 days.

const SCANNER_UA = /bot|crawl|spider|preview|scan|python|curl|wget|headless|go-http|java\/|okhttp|axios|node-fetch|facebookexternalhit|slackbot|linkedinbot|twitterbot|whatsapp|telegram|skype|outlook|ms-office|microsoft office|safelinks|proofpoint|mimecast|barracuda|validator|monitor|uptime/i;
const SCANNER_NET = /microsoft|amazon|google|proofpoint|mimecast|barracuda|forcepoint|zscaler|cisco|palo alto|digitalocean|ovh|hetzner|linode|akamai|oracle|alibaba|tencent|choopa|vultr|leaseweb|m247|datacamp|cloudflare/i;

export async function logVisit(context, record) {
  const { request, env } = context;
  if (!env.VISITS) return;
  const cf = request.cf || {};
  const ua = (request.headers.get("user-agent") || "").slice(0, 200);
  let ref = "";
  try { ref = new URL(request.headers.get("referer") || "").host; } catch (e) { ref = ""; }
  const net = String(cf.asOrganization || "").slice(0, 80);
  const now = new Date().toISOString();
  const meta = {
    t: now,
    c: record.code || "",
    p: record.path || "",
    k: record.kind || "",
    co: cf.country || "",
    rg: String(cf.region || "").slice(0, 40),
    ci: String(cf.city || "").slice(0, 40),
    n: net,
    ua,
    rf: ref,
    s: SCANNER_UA.test(ua) || SCANNER_NET.test(net) ? 1 : 0,
  };
  const key = "v:" + now + ":" + Math.random().toString(36).slice(2, 8);
  try {
    await env.VISITS.put(key, "", { metadata: meta, expirationTtl: 15552000 });
  } catch (e) {
    // A logging failure must never break the page.
  }
}
