// Records page loads of the demo pages, so a visit is counted even when the
// reader arrives on a plain link that was sent before short links existed.
// Only full page loads of the listed demos are recorded; every other request
// (the home page, the blog, assets, /api) passes straight through.
import { logVisit } from "../lib/visits/log.js";

const DEMOS = [
  "back", "budget-desk", "covenant-desk", "covenant-review", "deal-intake",
  "deploy-desk", "eligibility-desk", "feasibility-desk", "first-pass",
  "intake-copilot", "leakage-desk", "lender-first-14-days", "limit-desk",
  "mandate-desk", "mortgage-fde", "outcome-desk", "payoff-desk",
  "portfolio-sentinel", "qap-engine", "rate-desk", "realization-guard",
  "rerun-desk", "trace-desk",
];

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "GET") {
    const url = new URL(request.url);
    const first = url.pathname.split("/")[1] || "";
    const isPage = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
    const wantsHtml = (request.headers.get("accept") || "").includes("text/html");
    if (DEMOS.includes(first) && isPage && wantsHtml) {
      context.waitUntil(logVisit(context, { path: "/" + first + "/", kind: "page" }));
    }
  }
  return context.next();
}
