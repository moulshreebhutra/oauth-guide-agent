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

import { webPrompt } from "../lib/webask";
test("web prompt carries the method, format and gap rules", () => {
  const p = webPrompt("How long is review?", { app: "Zoom", passages: [{ id: "w1#1", slug: "web", app: "Zoom", section: "x", text: "Zoom. Apps need review.", url: "https://developers.zoom.us/x" } as any], pages: [], composio: { status: "yes", methods: ["OAUTH2"] }, steps: [] });
  for (const s of ["METHOD", "FORMAT", "Not stated in the pages we read", "[w1#1]", "AVAILABLE", "QUESTION: How long is review?"]) if (!p.includes(s)) throw new Error("missing " + s);
});

import { FAMILY } from "../lib/webask";
import { skillText, FIELDS } from "../data/skill";
test("skill covers method, format, links and question moves", () => {
  const t = skillText("How long does Instagram review take and can an agent do it?");
  for (const x of ["METHOD", "FORMAT", "LINKS", "TIMING QUESTION", "AGENT QUESTION", "Not stated in the pages we read"]) assert.ok(t.includes(x), x);
  assert.ok(FIELDS.length >= 12);
});
test("apps under a researched platform map to its guide, and the prompt uses it", () => {
  assert.equal(FAMILY.instagram.slug, "meta");
  assert.equal(FAMILY.youtube.slug, "google-workspace");
  assert.ok(loadGuide(FAMILY.instagram.slug));
  const p = webPrompt("Do I need review?", { family: FAMILY.instagram, app: "Instagram", passages: [{ id: "meta#3", slug: "meta", app: "Meta", section: "Requirements", text: "App Review is needed.", url: "https://x.test/guide/meta", tag: "sourced" } as any], pages: [], composio: null, steps: [] });
  assert.ok(p.includes("OUR LIBRARY") && p.includes("registered and reviewed through Meta") && p.includes("METHOD") && p.includes("Likely, from general knowledge"));
});
