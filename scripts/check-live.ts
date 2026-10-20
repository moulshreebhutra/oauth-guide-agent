/* Run from a machine with internet:  npx tsx scripts/check-live.ts https://oauth-guide-agent.vercel.app
   Checks the deployed site end to end: Gemini key and models, retrieval, written answers, citations, refusals. */
const base = (process.argv[2] || "https://oauth-guide-agent.vercel.app").replace(/\/$/, "");
let failed = 0;
const ok = (name: string, pass: boolean, info = "") => { console.log(`${pass ? "PASS" : "FAIL"}  ${name}${info ? "  - " + info : ""}`); if (!pass) failed++; };
const ask = async (question: string, phase?: string) => (await fetch(`${base}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, phase }) })).json() as Promise<any>;

async function main() {
const h: any = await (await fetch(`${base}/api/health`)).json();
ok("GEMINI_API_KEY is set on the server", !!h.keyConfigured);
const working = (h.tests ?? []).filter((t: any) => t.ok);
ok("at least one Gemini model answers", working.length > 0, working.map((t: any) => `${t.model} ${t.ms}ms`).join(", ") || JSON.stringify((h.tests ?? []).map((t: any) => `${t.model}: ${t.error}`)).slice(0, 300));

const cases: [string, (r: any) => boolean, string][] = [
  ["How long does Google verification take?", (r) => r.mode === "answer" && !r.extractive && /week/i.test(r.answer) && r.cited?.some((c: string) => c.startsWith("google")), "AI answer mentions weeks and cites Google"],
  ["GITHUB", (r) => r.passages?.length > 0 && r.passages?.every((p: any) => p.slug === "github"), "app name returns only GitHub passages"],
  ["Which providers need a review before other companies can use my app?", (r) => new Set(r.passages?.map((p: any) => p.slug)).size >= 2, "covers more than one provider"],
  ["How long does Shopify review take?", (r) => r.mode === "answer" && /not (published|state|specif)|no (official|duration|time)|does not (state|say|give)/i.test(r.answer ?? ""), "admits no duration is published"],
  ["How do I register an app for Zoom?", (r) => r.general === true || r.mode === "none", "Zoom is labelled as outside the guides"],
];
for (const [q, check, what] of cases) {
  try { const r = await ask(q); ok(q, check(r), r.extractive ? "fell back to quoted passages: " + (r.detail ?? "") : what); } catch (e: any) { ok(q, false, String(e.message)); }
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
}
main();
