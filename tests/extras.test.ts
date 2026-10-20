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

import { explainError, friendlyTool } from "../lib/livelog";
test("live log: friendly steps and readable errors", () => {
  assert.match(friendlyTool("fetch_page", "https://developers.facebook.com/docs/x", "42 chars").title, /facebook\.com/);
  assert.equal(friendlyTool("fetch_page", "https://a.com/x", "42 chars").state, "warn");
  const e = explainError("claude: HTTP 400 invalid_request_error | search failed 403 | gemini: 429 RESOURCE_EXHAUSTED");
  assert.ok(e.fix.some((f) => /TAVILY/.test(f)) && e.fix.some((f) => /Claude/.test(f)));
  assert.ok(!/^\s*\{/.test(e.headline));
});

import { generate } from "../lib/llm";
test("llm: a reply that fails the format check moves on; Claude gets a final retry", async () => {
  const saved = { fetch: globalThis.fetch, a: process.env.ANTHROPIC_API_KEY, g: process.env.GROQ_API_KEY, m: process.env.GEMINI_API_KEY, o: process.env.OPENROUTER_API_KEY };
  process.env.ANTHROPIC_API_KEY = "test"; delete process.env.GROQ_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY;
  const replies = ["Sure! Here is the guide in prose", '{"ok":true}'];
  let calls = 0;
  globalThis.fetch = (async () => new Response(JSON.stringify({ content: [{ type: "text", text: replies[calls++] }] }), { status: 200 })) as any;
  try {
    const out = await generate("x", { json: true, deadlineMs: 30_000, accept: (t) => { try { JSON.parse(t); return true; } catch { return false; } } });
    assert.equal(out, '{"ok":true}');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = saved.fetch;
    for (const [k, v] of [["ANTHROPIC_API_KEY", saved.a], ["GROQ_API_KEY", saved.g], ["GEMINI_API_KEY", saved.m], ["OPENROUTER_API_KEY", saved.o]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
test("llm: errors name every provider that failed", async () => {
  const saved = { fetch: globalThis.fetch, a: process.env.ANTHROPIC_API_KEY, g: process.env.GROQ_API_KEY, m: process.env.GEMINI_API_KEY, o: process.env.OPENROUTER_API_KEY };
  process.env.ANTHROPIC_API_KEY = "test"; delete process.env.GROQ_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY;
  globalThis.fetch = (async () => new Response('{"error":"nope"}', { status: 401 })) as any;
  try { await assert.rejects(() => generate("x", { deadlineMs: 20_000 }), /claude: HTTP 401/); }
  finally {
    globalThis.fetch = saved.fetch;
    for (const [k, v] of [["ANTHROPIC_API_KEY", saved.a], ["GROQ_API_KEY", saved.g], ["GEMINI_API_KEY", saved.m], ["OPENROUTER_API_KEY", saved.o]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test("live log: sizes are replaced by what was read", () => {
  const r = friendlyTool("fetch_page", "https://developers.zoom.us/docs/x", "6815 chars", { url: "https://developers.zoom.us/docs/x", excerpt: "Zoom apps need review before listing." });
  assert.equal(r.detail, undefined);
  assert.match(r.data!.excerpt!, /Zoom apps/);
  const s = friendlyTool("search_web", "q", "8 results", { items: [{ title: "t", url: "https://a.com" }] });
  assert.equal(s.detail, undefined);
});

test("live log: a Gemini billing message is not blamed on Claude's credit", () => {
  const e = explainError("claude: The operation was aborted due to timeout | gemini: 429 You exceeded your current quota, please check your plan and billing details | claude: no time left");
  assert.ok(!e.fix.some((f) => /no usable credit/.test(f)));
  assert.ok(e.fix.some((f) => /did not finish writing/.test(f)));
});

import { repairDraft } from "../lib/agent";
test("repairDraft fixes labels but not facts", () => {
  const d: any = repairDraft({ wait: { kind: "Not published", range: { min_days: "x", max_days: 3 }, statement: "s", tag: "Official" }, difficulty: { tier: "3" }, steps: [{ who: "User", tag: "community" }] });
  assert.equal(d.wait.kind, "unpublished");
  assert.equal(d.wait.range, null);
  assert.equal(d.wait.tag, "sourced");
  assert.equal(d.difficulty.tier, 3);
  assert.equal(d.steps[0].who, "you");
  assert.equal(d.steps[0].tag, "reported");
  assert.equal(d.generated_by, "agent");
});

test("skill: brackets are for passage ids only", () => { assert.match(skillText("x"), /Square brackets are ONLY for passage ids/); });

test("repairDraft fills null setup minutes with a labelled estimate", () => {
  const d: any = repairDraft({ difficulty: { tier: 4 }, effort: { hands_on_minutes: { min: null, max: null }, basis: "none", tag: "sourced" } });
  assert.deepEqual(d.effort.hands_on_minutes, { min: 60, max: 180 });
  assert.equal(d.effort.tag, "inferred");
  assert.match(d.effort.basis, /estimate/i);
  const e: any = repairDraft({ difficulty: { tier: 2 }, effort: { hands_on_minutes: { min: 40, max: 15 }, basis: "b", tag: "sourced" } });
  assert.deepEqual(e.effort.hands_on_minutes, { min: 15, max: 40 });
  assert.equal(e.effort.tag, "sourced");
});

import { appFromInput } from "../lib/webask";
test("appFromInput pulls the app out of a typed question", () => {
  assert.equal(appFromInput("How long does Discord take to verify a bot or app?"), "Discord");
  assert.equal(appFromInput("Zoom"), "Zoom");
  assert.equal(appFromInput("zoom.us"), "zoom.us");
  assert.equal(appFromInput("what is the weather like today in town"), null);
});

test("appFromInput handles more phrasings", () => {
  assert.equal(appFromInput("how do i connect to Foobarbaz Cloud"), "Foobarbaz");
  assert.equal(appFromInput("how long does figma take to approve an app"), "Figma");
  assert.equal(appFromInput("How do I register an OAuth app for Calendly?"), "Calendly");
  assert.equal(appFromInput("how do I get oauth working for acme-crm please"), "acme-crm");
  assert.equal(appFromInput("What is the capital of France?"), null);
});

import { usablePage } from "../lib/agent";
test("usablePage drops JS shells and pages that are not about the app", () => {
  assert.equal(usablePage("Discord Developer Portal", "Discord"), false);
  assert.equal(usablePage("Your agents decide. We make it happen ".repeat(20), "Discord"), false);
  assert.equal(usablePage("Discord apps can be verified once they reach 75 servers. ".repeat(10), "Discord"), true);
  assert.equal(usablePage("zoom.us marketplace apps need review. ".repeat(12), "zoom.us"), true);
});

import { cleanText, decodeEntities, prettyTitle } from "../lib/text";
test("text helpers clean markdown, entities and url titles", () => {
  assert.equal(decodeEntities("app users&#039; accounts &amp; more"), "app users' accounts & more");
  assert.equal(cleanText("# Meta overview\n- [Instagram API](https://x.com/a) **works** with `code`"), "Meta overview - Instagram API works with code");
  assert.equal(prettyTitle("https://developers.facebook.com/documentation/instagram-platform/app-review", "https://developers.facebook.com/documentation/instagram-platform/app-review"), "developers.facebook.com: instagram platform / app review");
  assert.equal(prettyTitle("Real title", "https://x.com"), "Real title");
});

import { keyFacts } from "../lib/text";
test("keyFacts picks the OAuth-relevant sentences and skips navigation noise", () => {
  const page = "Skip to content\nAll Toolkits Instagram INSTAGRAM_CREATE_POST INSTAGRAM_DELETE_COMMENT INSTAGRAM_GET_USER Tools (40)\n# Instagram Platform overview\nThe Instagram Platform is a collection of APIs that lets your app reach professional accounts.\nYour app must complete [App Review](https://x.com/r) before it can request permissions with Advanced Access from any app user.\nBusiness Verification is required before publishing, and review time is not stated on this page.";
  const f = keyFacts(page, 2);
  assert.equal(f.length, 2);
  assert.ok(f.every((x) => !/INSTAGRAM_|Skip to/.test(x)));
  assert.ok(f.some((x) => /App Review/.test(x) && !/\]\(/.test(x)));
});

test("composio toolkit page: reads the web wording and the plain-text .md wording, and tries sensible slugs", async () => {
  const { parseComposioToolkit, toolkitSlugs } = await import("../lib/tools");
  assert.equal(parseComposioToolkit("- **Auth:** OAUTH2\n- **Composio-managed OAuth available?** No").status, "no");
  assert.equal(parseComposioToolkit("- **Auth:** OAUTH2\n- **Composio-managed OAuth available?** Yes").status, "yes");
  assert.deepEqual(parseComposioToolkit("- **Auth:** OAUTH2").methods, ["OAuth2"]);
  assert.ok(toolkitSlugs("TikTok").includes("tiktok"));
  assert.ok(toolkitSlugs("Google Calendar").includes("googlecalendar") && toolkitSlugs("Google Calendar").includes("google_calendar"));
});

test("composio toolkit page: the TikTok page text as shown in a browser reads as not managed, OAuth2", async () => {
  const { parseComposioToolkit } = await import("../lib/tools");
  const r = parseComposioToolkit("TikTok short-form video platform\nAuthentication DetailsComposio-managed OAuth not available\nOAuth2\nTools (9)");
  assert.deepEqual(r, { status: "no", methods: ["OAuth2"] });
});
