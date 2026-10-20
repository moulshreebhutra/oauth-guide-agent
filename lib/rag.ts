import { loadGuides } from "./guides";
import type { Guide } from "./schema";

/**
 * Retrieval for the "Ask" feature and for calibrating the live agent.
 *  1. CHUNK  every guide is cut into small passages (one claim, step, blocker, quote, ...)
 *  2. INDEX  BM25 over those passages (keyword relevance with length normalisation)
 *  3. RETRIEVE top passages for a question
 *  4. GENERATE (in /api/ask) the model may answer only from them, and must cite them
 * BM25 needs no API key, runs in microseconds and can be unit-tested offline. Embeddings would add
 * synonym matching ("approval" ~ "review") and are the natural upgrade; see the /how-it-works page.
 */
export type Chunk = { id: string; slug: string; app: string; section: string; text: string; tag?: string };

export function chunkGuide(g: Guide): Chunk[] {
  const out: Omit<Chunk, "id">[] = [];
  const add = (section: string, text: string, tag?: string) => out.push({ slug: g.slug, app: g.app, section, text: `${g.app}. ${text}`, tag });
  add("Summary", g.summary);
  add("Difficulty", `Difficulty tier ${g.difficulty.tier} (${g.difficulty.label}). ${g.difficulty.rationale}`, g.difficulty.tag);
  add("Your time", `Hands-on time ${g.effort.hands_on_minutes.min}-${g.effort.hands_on_minutes.max} minutes. ${g.effort.basis}`, g.effort.tag);
  add("Approval wait", `${g.wait.display ? g.wait.display + ". " : ""}${g.wait.statement}`, g.wait.tag);
  add("Composio managed auth", `${g.composio_managed.status}. ${g.composio_managed.note}`, g.composio_managed.tag);
  for (const c of g.requirements) add("Requirements", c.text, c.tag);
  for (const c of g.scopes_and_access) add("Scopes and access", c.text, c.tag);
  for (const c of g.review_process) add("Review process", c.text, c.tag);
  for (const c of g.gotchas) add("Gotchas", c.text, c.tag);
  for (const s of g.steps) add(`Step ${s.n}`, `${s.title}. ${s.detail} Done by: ${s.who}.${s.why_not_agent ? " Why you: " + s.why_not_agent : ""}`, s.tag);
  for (const b of g.blockers) add("If you get stuck", `Symptom: ${b.symptom}. Cause: ${b.likely_cause}. Fix: ${b.fix}. Escalate when: ${b.escalate_when}`, b.tag);
  add("Agent versus you", `An agent can: ${g.agent_vs_you.agent_can.join(" ")} You must: ${g.agent_vs_you.you_must.join(" ")}`);
  for (const e of g.evidence) add("Source quote", `"${e.excerpt}" (${e.title})`);
  for (const u of g.uncertainties) add("Unsure", u);
  return out.map((c, i) => ({ ...c, id: `${g.slug}#${i + 1}` }));
}

const STOP = new Set("a an and are as at be by can do does for from how i if in is it its of on or so that the their there this to was what when where which who will with you your we our not no about into than then they them should would could need needs get".split(" "));
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t));
}

type Index = { chunks: Chunk[]; tf: Map<string, number>[]; len: number[]; df: Map<string, number>; avg: number };
let cache: Index | null = null;

export function buildIndex(chunks: Chunk[]): Index {
  const tf: Map<string, number>[] = [];
  const len: number[] = [];
  const df = new Map<string, number>();
  for (const c of chunks) {
    const toks = tokenize(`${c.app} ${c.section} ${c.text}`);
    const m = new Map<string, number>();
    for (const t of toks) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(m);
    len.push(toks.length);
  }
  return { chunks, tf, len, df, avg: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length) };
}

export function getIndex(): Index {
  if (!cache) cache = buildIndex(loadGuides().flatMap(chunkGuide));
  return cache;
}

export type Hit = Chunk & { score: number };

// Words people use interchangeably when asking about approval. Each group is matched as one query term.
const SYNONYMS = [
  ["review", "approval", "approve", "verification", "verify", "audit", "vetting", "listing", "marketplace"],
  ["wait", "duration", "timeline", "turnaround", "weeks", "days"],
  ["agent", "automate", "automation", "automatically"],
  ["company", "companies", "customer", "customers", "outside", "external", "tenant", "workspace", "workspaces", "merchant", "merchants"],
  ["secret", "credential", "credentials", "key", "token"],
  ["easy", "easiest", "hard", "hardest", "difficult", "difficulty", "tier"],
].map((g) => [...new Set(g.flatMap((w) => tokenize(w)))]);
const groupOf = (t: string) => SYNONYMS.find((g) => g.includes(t)) ?? [t];

export function search(query: string, opts: { k?: number; slug?: string; index?: Index } = {}): Hit[] {
  const ix = opts.index ?? getIndex();
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const N = ix.chunks.length;
  const k1 = 1.4, b = 0.75;
  const hits: Hit[] = [];
  ix.chunks.forEach((c, i) => {
    if (opts.slug && c.slug !== opts.slug) return;
    let score = 0;
    let matched = 0;
    for (const t of q) {
      let best = 0;
      for (const m of groupOf(t)) {
        const f = ix.tf[i].get(m);
        if (!f) continue;
        const n = ix.df.get(m) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        best = Math.max(best, idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len[i]) / ix.avg))));
      }
      if (best > 0) {
        matched++;
        score += best;
      }
    }
    // require real overlap: at least half of the (non-stopword) query terms, minimum one
    if (matched >= Math.max(1, Math.ceil(q.length / 2))) hits.push({ ...c, score });
  });
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.k ?? 6);
}

/** Which passage ids does an answer cite, and are they all ones we actually retrieved? */
export function checkCitations(answer: string, allowed: Set<string>): { cited: string[]; invalid: string[] } {
  const ids = [...answer.matchAll(/\[([a-z0-9-]+#\d+)\]/g)].map((m) => m[1]);
  const cited = [...new Set(ids.filter((i) => allowed.has(i)))];
  const invalid = [...new Set(ids.filter((i) => !allowed.has(i)))];
  return { cited, invalid };
}
