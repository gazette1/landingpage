// GET /r/<code>: record the visit, then send the reader to the demo.
import { CODES } from "../../lib/visits/codes.js";
import { logVisit } from "../../lib/visits/log.js";

export async function onRequestGet(context) {
  const code = String(context.params.code || "").toLowerCase().slice(0, 16);
  const path = CODES[code];
  context.waitUntil(logVisit(context, { code, path: path || "", kind: path ? "short" : "unknown-code" }));
  const dest = new URL(path || "/", context.request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: dest.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
