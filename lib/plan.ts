import type { Guide } from "./schema";

/** Launch planner: pure arithmetic over the guides' own numbers. No model, no guessing: an unpublished wait stays unknown. */
export type PlanRow = {
  slug: string; app: string; tier: number;
  setupMin: number; setupMax: number;          // your hands-on minutes (our estimate)
  waitMinDays: number | null; waitMaxDays: number | null; // provider wait, null = not published
  kind: "none" | "stated" | "unpublished";
  headline: string;
};
export type Plan = {
  rows: PlanRow[];
  startOrder: PlanRow[];                         // submit the longest or least predictable waits first
  handsOnHours: { min: number; max: number };    // one person doing every setup one after another
  waitDays: { min: number; max: number | null }; // providers wait in parallel, so the slowest one sets it
  unknown: PlanRow[];
  earliest: Date; latest: Date | null;
  notes: string[];
};

export function rowOf(g: Guide): PlanRow {
  const w = g.wait;
  const kind = (w.kind ?? (w.range ? "stated" : w.tag === "unknown" ? "unpublished" : "none")) as PlanRow["kind"];
  return {
    slug: g.slug, app: g.app.replace(/\s*\(.*\)/, ""), tier: g.difficulty.tier,
    setupMin: g.effort.hands_on_minutes.min, setupMax: g.effort.hands_on_minutes.max,
    waitMinDays: kind === "none" ? 0 : w.range ? w.range.min_days : null,
    waitMaxDays: kind === "none" ? 0 : w.range ? w.range.max_days : null,
    kind, headline: w.headline ?? w.display ?? (w.range ? `${w.range.min_days}-${w.range.max_days} days` : "Not published"),
  };
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const workDays = (hours: number) => Math.ceil(hours / 4); // assume 4 focused hours a day on setup

export function buildPlan(rows: PlanRow[], today: Date): Plan {
  const unknown = rows.filter((r) => r.waitMaxDays === null);
  const known = rows.filter((r) => r.waitMaxDays !== null);
  const hMin = rows.reduce((a, r) => a + r.setupMin, 0) / 60;
  const hMax = rows.reduce((a, r) => a + r.setupMax, 0) / 60;
  const waitMin = known.reduce((a, r) => Math.max(a, r.waitMinDays ?? 0), 0);
  const waitMax = unknown.length ? null : known.reduce((a, r) => Math.max(a, r.waitMaxDays ?? 0), 0);
  // longest and least predictable first: unknown waits, then by maximum wait
  const startOrder = [...rows].sort((a, b) => (b.waitMaxDays === null ? 1e6 : b.waitMaxDays) - (a.waitMaxDays === null ? 1e6 : a.waitMaxDays) || b.tier - a.tier);
  const earliest = addDays(today, workDays(hMin) + waitMin);
  const latest = waitMax === null ? null : addDays(today, workDays(hMax) + waitMax);
  const notes: string[] = [];
  if (!rows.length) notes.push("Pick at least one provider.");
  if (unknown.length) notes.push(`${unknown.map((r) => r.app).join(", ")} ${unknown.length > 1 ? "publish" : "publishes"} no approval time, so there is no latest date. Plan for the unknown and ask the provider early.`);
  if (rows.some((r) => r.kind === "none")) notes.push("Providers with no review are ready as soon as your setup is done.");
  notes.push("Waits run in parallel, so the slowest provider sets the launch date. Submit that one first.");
  notes.push("Setup time is our estimate (providers publish none), assumes one person at 4 focused hours a day, and the wait is only for what the provider states: some waits apply to a Marketplace listing, not to a private connection.");
  return { rows, startOrder, handsOnHours: { min: hMin, max: hMax }, waitDays: { min: waitMin, max: waitMax }, unknown, earliest, latest, notes };
}
