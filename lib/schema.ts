import { z } from "zod";

/**
 * Evidence tags. Every factual claim in a guide carries one.
 *  tested     - a person completed this step against the real provider (see tested_log)
 *  sourced    - an official/primary page states it; evidence ids point at a quoted excerpt
 *  reported   - only third parties / community say it (forums, blogs); not official
 *  inferred   - our reasoning from other facts; not stated anywhere
 *  unknown    - we looked and could not find out
 */
export const Tag = z.enum(["tested", "sourced", "reported", "inferred", "unknown"]);
export type Tag = z.infer<typeof Tag>;

export const Evidence = z.object({
  id: z.string().regex(/^e\d+$/),
  url: z.string().url(),
  title: z.string(),
  retrieved_at: z.string(), // ISO date
  excerpt: z.string().max(600), // literal text from the page
  official: z.boolean(), // provider-owned page?
  // unchecked: excerpt came from a fetch summary and has not been re-matched against raw page text
  // verified:  excerpt literally appears in the raw page text (done by code, not by the model)
  // failed:    excerpt could not be found in the page text
  quote_check: z.enum(["unchecked", "verified", "failed"]),
});
export type Evidence = z.infer<typeof Evidence>;

const Claim = z.object({
  text: z.string().min(3),
  tag: Tag,
  evidence: z.array(z.string()).default([]), // evidence ids
});
export type Claim = z.infer<typeof Claim>;

export const Tier = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const Step = z.object({
  n: z.number().int().positive(),
  title: z.string(),
  detail: z.string(),
  who: z.enum(["you", "agent", "either"]), // who has to do this
  why_not_agent: z.string().optional(), // set when who === "you"
  tag: Tag,
  evidence: z.array(z.string()).default([]),
});

export const Blocker = z.object({
  symptom: z.string(),
  likely_cause: z.string(),
  fix: z.string(),
  escalate_when: z.string(),
  tag: Tag,
  evidence: z.array(z.string()).default([]),
});

export const TestedEntry = z.object({
  date: z.string(),
  by: z.string(),
  what: z.string(),
  outcome: z.string(),
  minutes: z.number().optional(),
  note: z.string().optional(),
});

export const Guide = z.object({
  app: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  provider_domain: z.string(),
  summary: z.string(),
  difficulty: z.object({
    tier: Tier,
    label: z.string(),
    rationale: z.string(),
    tag: Tag,
    evidence: z.array(z.string()).default([]),
  }),
  effort: z.object({
    hands_on_minutes: z.object({ min: z.number(), max: z.number() }),
    basis: z.string(), // where the number comes from
    tag: Tag,
  }),
  wait: z.object({
    // null range = no stated wait
    range: z.object({ min_days: z.number(), max_days: z.number() }).nullable(),
    display: z.string().optional(), // short label when a source gives a duration in words ("several weeks")
    headline: z.string().optional(), // big plain-language wait shown on the library cards
    note: z.string().optional(), // one sentence: what the wait applies to
    kind: z.enum(["none", "stated", "unpublished"]).optional(), // none = no review step; stated = provider gives a duration; unpublished = we looked, none given
    statement: z.string(),
    tag: Tag,
    evidence: z.array(z.string()).default([]),
  }),
  composio_managed: z.object({
    status: z.enum(["yes", "no", "unknown"]),
    note: z.string(),
    tag: Tag,
  }),
  requirements: z.array(Claim),
  scopes_and_access: z.array(Claim),
  gotchas: z.array(Claim),
  steps: z.array(Step).min(1),
  blockers: z.array(Blocker),
  review_process: z.array(Claim), // empty = none found
  next_actions: z.array(z.string()),
  agent_vs_you: z.object({
    agent_can: z.array(z.string()),
    you_must: z.array(z.string()),
  }),
  evidence: z.array(Evidence),
  tested_log: z.array(TestedEntry),
  last_verified: z.string(),
  uncertainties: z.array(z.string()),
  generated_by: z.enum(["human-researched", "agent"]),
});
export type Guide = z.infer<typeof Guide>;

export const TIER_LABELS: Record<number, string> = {
  1: "Self-serve",
  2: "Light checks",
  3: "Review required",
  4: "Gated / partner approval",
};

/** Cross-field rules a schema alone can't express. Returns a list of problems (empty = ok). */
export function lintGuide(g: Guide): string[] {
  const problems: string[] = [];
  const ids = new Set(g.evidence.map((e) => e.id));
  const refs: [string, string[]][] = [];
  refs.push(["difficulty", g.difficulty.evidence]);
  refs.push(["wait", g.wait.evidence]);
  for (const c of [...g.requirements, ...g.scopes_and_access, ...g.gotchas, ...g.review_process])
    refs.push([`claim "${c.text.slice(0, 40)}"`, c.evidence]);
  for (const s of g.steps) refs.push([`step ${s.n}`, s.evidence]);
  for (const b of g.blockers) refs.push([`blocker "${b.symptom.slice(0, 30)}"`, b.evidence]);
  for (const [where, list] of refs)
    for (const id of list) if (!ids.has(id)) problems.push(`${where} cites missing evidence ${id}`);

  // sourced claims must cite at least one evidence item
  const sourcedNoEvidence = (where: string, tag: Tag, ev: string[]) => {
    if (tag === "sourced" && ev.length === 0) problems.push(`${where} is tagged sourced but cites no evidence`);
  };
  for (const c of [...g.requirements, ...g.scopes_and_access, ...g.gotchas, ...g.review_process])
    sourcedNoEvidence(`claim "${c.text.slice(0, 40)}"`, c.tag, c.evidence);
  for (const s of g.steps) sourcedNoEvidence(`step ${s.n}`, s.tag, s.evidence);
  for (const b of g.blockers) sourcedNoEvidence(`blocker "${b.symptom.slice(0, 30)}"`, b.tag, b.evidence);
  sourcedNoEvidence("difficulty", g.difficulty.tag, g.difficulty.evidence);
  sourcedNoEvidence("wait", g.wait.tag, g.wait.evidence);

  // 'tested' claims need a tested_log entry
  const anyTested =
    g.steps.some((s) => s.tag === "tested") ||
    g.blockers.some((b) => b.tag === "tested") ||
    g.effort.tag === "tested";
  if (anyTested && g.tested_log.length === 0) problems.push("something is tagged tested but tested_log is empty");

  // a time estimate can only be 'sourced' if a source states it
  if (g.effort.tag === "sourced" && g.evidence.length === 0) problems.push("effort sourced with no evidence");
  if (g.wait.range && g.wait.tag === "sourced" && g.wait.evidence.length === 0)
    problems.push("wait range is tagged sourced with no evidence");

  // steps marked 'you' must say why an agent can't
  for (const s of g.steps) if (s.who === "you" && !s.why_not_agent) problems.push(`step ${s.n} is 'you' without why_not_agent`);
  return problems;
}
