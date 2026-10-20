import { Guide, lintGuide, type Evidence, type Tag } from "./schema";
import { excerptAppearsIn } from "./safety";

export type Fetched = { url: string; title: string; text: string; official: boolean };

type Cited = { tag: Tag; evidence: string[] };

/**
 * Turns a model-written draft into a guide we are willing to show:
 *  1. evidence must come from a page we actually fetched in this run;
 *  2. the excerpt must literally appear in that page's text, else the evidence is dropped;
 *  3. any claim tagged 'sourced' that lost all its evidence is downgraded to 'inferred';
 *  4. nothing may be tagged 'tested' (only humans test);
 *  5. the result is schema-validated and linted.
 */
export function enforce(draft: unknown, fetched: Fetched[], now = new Date().toISOString().slice(0, 10)) {
  const notes: string[] = [];
  const d = draft as Record<string, any>;
  const byUrl = new Map(fetched.map((f) => [f.url, f]));

  const keptEvidence: Evidence[] = [];
  const keptIds = new Set<string>();
  for (const e of (d.evidence ?? []) as any[]) {
    const page = byUrl.get(e.url);
    if (!page) {
      notes.push(`dropped evidence ${e.id}: URL was never fetched`);
      continue;
    }
    if (!excerptAppearsIn(String(e.excerpt ?? ""), page.text)) {
      notes.push(`dropped evidence ${e.id}: excerpt not found in fetched page`);
      continue;
    }
    keptIds.add(e.id);
    keptEvidence.push({
      id: e.id,
      url: e.url,
      title: page.title || e.title || e.url,
      retrieved_at: now,
      excerpt: String(e.excerpt).slice(0, 600),
      official: page.official,
      quote_check: "verified",
    });
  }
  d.evidence = keptEvidence;

  const fix = (c: Cited & Record<string, any>, label: string) => {
    c.evidence = (c.evidence ?? []).filter((id: string) => keptIds.has(id));
    if (c.tag === "tested") {
      c.tag = "inferred";
      notes.push(`${label}: 'tested' is reserved for human tests; downgraded`);
    }
    // a claim backed only by forum or community posts is what people report, not what the provider states
    if (c.tag === "sourced" && c.evidence.length > 0 && c.evidence.every((id: string) => keptEvidence.find((e) => e.id === id)?.official === false)) {
      c.tag = "reported";
      notes.push(`${label}: evidence is community or third-party only; sourced -> reported`);
    }
    // a number that only a community page contains is reported, not sourced
    if (c.tag === "sourced" && c.evidence.length > 0) {
      const text = String(c.statement ?? c.detail ?? c.text ?? c.rationale ?? "").replace(/https?:\/\/\S+/g, "").replace(/\[e\d+\]/g, "");
      const nums = (text.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? []).map((x) => x.replace(/,/g, "")).filter((x) => Number(x) >= 10 && !/^20\d\d$/.test(x));
      const pages = c.evidence.map((id: string) => keptEvidence.find((e) => e.id === id)).filter(Boolean) as Evidence[];
      const has = (o: boolean, n: string) => pages.some((e) => e.official === o && (byUrl.get(e.url)?.text ?? "").replace(/,/g, "").includes(n));
      const onlyCommunity = nums.filter((n) => !has(true, n) && has(false, n));
      if (onlyCommunity.length) { c.tag = "reported"; notes.push(`${label}: ${onlyCommunity.join(", ")} appears only on community pages; sourced -> reported`); }
    }
    if (c.tag === "sourced" && c.evidence.length === 0) {
      c.tag = "inferred";
      notes.push(`${label}: no verified evidence; downgraded sourced -> inferred`);
    }
  };

  // "no review is mentioned" is an absence: it cannot be sourced
  const ABSENCE = /\b(no|not|none|nothing)\b[^.]{0,50}\b(review|approval|approve|wait|fee|gate|step|duration|stated|mentioned|described|found|listed)\b|\b(does|do|did) not (state|mention|list|describe)/i;
  const noNum = (t: string) => !/\b\d{2,}\b/.test(t);
  for (const c of [d.difficulty, ...(d.review_process ?? [])]) {
    const t = String(c?.statement ?? c?.detail ?? c?.text ?? c?.rationale ?? "");
    if (c?.tag === "sourced" && ABSENCE.test(t) && noNum(t)) { c.tag = "unknown"; notes.push("an absence ('no review mentioned') cannot be sourced; tagged unknown"); }
  }
  fix(d.difficulty, "difficulty");
  // a high tier needs a stated gate; a reported or inferred one lowers it to 2
  if (d.difficulty?.tier >= 3 && d.difficulty.tag !== "sourced") { d.difficulty.tier = 2; notes.push("tier lowered to 2: the gate is only reported or inferred, not stated by an official page"); d.uncertainties = [...(d.uncertainties ?? []), "A review or partner gate was mentioned but not confirmed by an official page, so the tier was kept at 2 (light checks)."]; }
  // "no duration is published" is an absence, not something a page states
  if (d.wait?.kind === "unpublished" && d.wait.tag === "sourced") { d.wait.tag = "unknown"; notes.push("wait: an unpublished duration is tagged unknown, not sourced"); }
  fix(d.wait, "wait");
  if (d.effort?.tag === "tested") d.effort.tag = "inferred";
  // a sourced effort needs a verified quote that states time; we never let the model claim it
  if (d.effort?.tag === "sourced" && keptEvidence.length === 0) d.effort.tag = "inferred";
  for (const k of ["requirements", "scopes_and_access", "gotchas", "review_process"])
    (d[k] ?? []).forEach((c: any, i: number) => fix(c, `${k}[${i}]`));
  (d.steps ?? []).forEach((c: any, i: number) => fix(c, `steps[${i}]`));
  (d.blockers ?? []).forEach((c: any, i: number) => fix(c, `blockers[${i}]`));
  for (const s of d.steps ?? []) if (s.who === "you" && !s.why_not_agent) s.why_not_agent = "Needs your own account session or a decision only you can make.";

  // internal field names must never reach the reader
  d.uncertainties = (d.uncertainties ?? []).filter((u: string) => !/provider[_ ]domain|official[- ]guess|OFFICIAL_GUESS/i.test(u));
  d.tested_log = [];
  d.last_verified = now;
  d.generated_by = "agent";
  d.uncertainties = [
    ...(d.uncertainties ?? []),
    "This guide was generated by an agent in real time and has not been checked by a person. Treat 'sourced' items as quoted from the linked page, and everything else as a lead to verify.",
    ...(notes.length ? [`Automatic checks adjusted ${notes.length} item(s) (e.g. unverifiable quotes were removed).`] : []),
  ];
  if (d.composio_managed?.tag === "sourced") d.composio_managed.tag = "unknown";

  // sources nobody cites are noise; keep only evidence a claim uses
  const cited = new Set<string>();
  (function collect(o: any) { if (Array.isArray(o)) return o.forEach(collect); if (!o || typeof o !== "object") return; if (Array.isArray(o.evidence) && o.evidence.every((x: unknown) => typeof x === "string")) o.evidence.forEach((x: string) => cited.add(x)); for (const k of Object.keys(o)) if (k !== "evidence") collect(o[k]); })(d);
  d.evidence = d.evidence.filter((e: Evidence) => cited.has(e.id) || /docs\.composio\.dev/.test(e.url));
  // dropped evidence leaves gaps (e1, e2, e4, e6): renumber so the citations read e1, e2, e3, e4
  const renum = new Map(d.evidence.map((e: Evidence, i: number) => [e.id, `e${i + 1}`]));
  const walk = (o: any) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.evidence) && o.evidence.every((x: unknown) => typeof x === "string")) o.evidence = o.evidence.map((id: string) => renum.get(id) ?? id);
    for (const k of Object.keys(o)) if (k !== "evidence") walk(o[k]);
  };
  walk(d);
  d.evidence = d.evidence.map((e: Evidence) => ({ ...e, id: renum.get(e.id) ?? e.id }));

  const parsed = Guide.safeParse(d);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), notes };
  const problems = lintGuide(parsed.data);
  if (problems.length) return { ok: false as const, error: problems.join("; "), notes };
  return { ok: true as const, guide: parsed.data, notes };
}
