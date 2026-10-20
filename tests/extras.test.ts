import test from "node:test";
import assert from "node:assert/strict";
import { loadGuides, loadGuide } from "../lib/guides";
import { buildPlan, rowOf } from "../lib/plan";
import { agentBrief, guideMarkdown } from "../lib/export";

const day0 = new Date("2026-10-20T00:00:00Z");
test("plan: unknown waits give no latest date and sort first", () => {
  const p = buildPlan(["github", "shopify", "slack"].map((s) => rowOf(loadGuide(s)!)), day0);
  assert.equal(p.latest, null);
  assert.equal(p.waitDays.max, null);
  assert.equal(p.startOrder[0].slug, "shopify");
  assert.ok(p.unknown.some((r) => r.slug === "shopify"));
});
test("plan: no-review providers add no wait; slowest known provider sets the date", () => {
  const p = buildPlan(["github", "slack"].map((s) => rowOf(loadGuide(s)!)), day0);
  assert.equal(p.waitDays.max, loadGuide("slack")!.wait.range!.max_days);
  assert.ok(p.latest && p.latest > p.earliest);
  assert.equal(p.startOrder[0].slug, "slack");
});
test("plan: every guide yields a row without throwing", () => { for (const g of loadGuides()) assert.ok(rowOf(g).setupMax >= rowOf(g).setupMin); });
test("export: markdown and agent brief contain the right parts for every guide", () => {
  for (const g of loadGuides()) {
    const md = guideMarkdown(g), br = agentBrief(g);
    assert.ok(md.includes("## Steps") && md.includes("## Sources") && md.includes(g.app));
    assert.ok(br.includes("STOP and hand back") && br.includes("Never ask for, print or store secrets"));
    assert.ok(!/AIza|sk-[a-z0-9]{10}/i.test(md + br));
  }
});
