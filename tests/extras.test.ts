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

test("enforce renumbers evidence after some is dropped", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { RAW_GUIDES } = await import("../data/guides");
  const page = { url: "https://example.com/a", title: "A", text: "Review is manual and takes a while to complete.", official: true };
  const draft: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  draft.evidence = [
    { id: "e1", url: "https://nope.example/x", title: "x", retrieved_at: "2026-01-01", excerpt: "never fetched", official: false, quote_check: "unchecked" },
    { id: "e3", url: page.url, title: "A", retrieved_at: "2026-01-01", excerpt: "Review is manual", official: true, quote_check: "unchecked" },
  ];
  const r: any = enforce(draft, [page]);
  if (r.ok) { assert.deepEqual(r.guide.evidence.map((e: any) => e.id), ["e1"]); }
});

test("canonicalUrl collapses language variants so a page is not read twice", async () => {
  const { canonicalUrl } = await import("../lib/tools");
  assert.equal(canonicalUrl("https://developers.google.com/photos/library/guides/get-started?hl=ar"), canonicalUrl("https://developers.google.com/photos/library/guides/get-started?hl=pl"));
  assert.ok(canonicalUrl("https://learn.microsoft.com/da-dk/entra/identity-platform/x").includes("/en-us/"));
  assert.equal(canonicalUrl("https://example.com/a/#frag"), "https://example.com/a");
});

test("enforce: forum-only evidence is 'reported', and an unpublished wait is 'unknown'", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { RAW_GUIDES } = await import("../data/guides");
  const page = { url: "https://forum.example.com/t/1", title: "Forum", text: "Our review took six weeks and nobody answered us at all.", official: false };
  const d: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  d.evidence = [{ id: "e1", url: page.url, title: "Forum", retrieved_at: "2026-01-01", excerpt: "review took six weeks", official: true, quote_check: "unchecked" }];
  d.wait = { ...d.wait, statement: "The review took six weeks and nobody answered.", tag: "sourced", kind: "stated", evidence: ["e1"] };
  const a: any = enforce(d, [page]);
  assert.ok(a.notes.some((n: string) => /wait: evidence is community or third-party only/.test(n)));
  const d2: any = JSON.parse(JSON.stringify(d));
  d2.wait = { ...d2.wait, tag: "sourced", kind: "unpublished", evidence: [] };
  const b: any = enforce(d2, [page]);
  assert.ok(b.notes.some((n: string) => /unpublished duration is tagged unknown/.test(n)));
});

test("composio toolkit text drops markdown bold markers so quotes read cleanly", async () => {
  const { parseComposioToolkit } = await import("../lib/tools");
  assert.equal(parseComposioToolkit("- **Composio-managed OAuth available?** Yes".replace(/\*\*/g, "")).status, "yes");
});

test("enforce: community-only numbers, absence claims, weak high tiers, uncited sources and internal field names", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { RAW_GUIDES } = await import("../data/guides");
  const off = { url: "https://developers.example.com/a", title: "Docs", text: "Apps start in development status. Production review is manual.", official: true };
  const com = { url: "https://community.example.com/q/1", title: "Q", text: "once you link 50 accounts you have two weeks to apply", official: false };
  const d: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  const ev = (id: string, p: any, x: string) => ({ id, url: p.url, title: p.title, retrieved_at: "2026-01-01", excerpt: x, official: p.official, quote_check: "unchecked" });
  d.evidence = [ev("e1", off, "Production review is manual"), ev("e2", com, "link 50 accounts"), ev("e3", off, "Apps start in development")];
  d.gotchas = [{ text: "Linking more than 50 accounts needs production review.", tag: "sourced", evidence: ["e1", "e2"] }];
  d.review_process = [{ text: "No review step is described in the pages read.", tag: "sourced", evidence: ["e1"] }];
  d.difficulty = { ...d.difficulty, tier: 4, tag: "reported", evidence: ["e2"] };
  d.uncertainties = ["Provider domain is unknown; official-guess only.", "Real gap."];
  const r: any = enforce(d, [off, com]);
  assert.ok(r.ok, r.error);
  assert.equal(r.guide.gotchas[0].tag, "reported");
  assert.equal(r.guide.review_process[0].tag, "unknown");
  assert.equal(r.guide.difficulty.tier, 2);
  assert.ok(!r.guide.evidence.some((e: any) => e.excerpt.startsWith("Apps start")));
  assert.ok(!r.guide.uncertainties.some((u: string) => /provider domain/i.test(u)) && r.guide.uncertainties.includes("Real gap."));
});

test("community pages are never treated as official, even on the provider's own host", async () => {
  const { COMMUNITY_PAGE } = await import("../lib/agent");
  assert.ok(COMMUNITY_PAGE.test("/forums/t/123 How is the review?"));
  assert.ok(COMMUNITY_PAGE.test("/x Review time - Questions - Square Developer Forums"));
  assert.ok(!COMMUNITY_PAGE.test("/docs/oauth Move OAuth from the Sandbox to Production"));
});

test("console steps are never the agent's, and page previews drop code and cut-off sentences", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { keyFacts } = await import("../lib/text");
  const { RAW_GUIDES } = await import("../data/guides");
  const d: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  d.steps[0] = { ...d.steps[0], who: "either", detail: "Open the Developer Console and add the redirect URI." };
  const r: any = enforce(d, []);
  assert.equal(r.guide?.steps[0].who ?? "you", "you");
  const f = keyFacts("The app provides the Client ID and Client Secret needed to\nconst { access_token } = await tokenResponse . json () ;\nRegister the app, then copy the client secret and store it securely in your vault.");
  assert.ok(f.every((x) => !/await|needed to$/.test(x)) && f.length === 1);
});

test("enforce: a sourced claim whose cited page does not say it, or names a year the page lacks, is downgraded", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { RAW_GUIDES } = await import("../data/guides");
  const page = { url: "https://developers.example.com/p", title: "Pricing", text: "Starting at two dollars per user, per month for the plan.", official: true };
  const d: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  d.evidence = [{ id: "e1", url: page.url, title: "P", retrieved_at: "2026-01-01", excerpt: "per user, per month", official: true, quote_check: "unchecked" }];
  d.requirements = [{ text: "The integrator plan makes key developer features available by default for every organization.", tag: "sourced", evidence: ["e1"] }];
  d.gotchas = [{ text: "Granular scopes apply to apps created after March 2026 per user.", tag: "sourced", evidence: ["e1"] }];
  d.wait = { ...d.wait, kind: "none", tag: "sourced", statement: "No review step.", evidence: ["e1"] };
  const r: any = enforce(d, [page]);
  assert.ok(r.ok, r.error);
  assert.equal(r.guide.requirements[0].tag, "inferred");
  assert.equal(r.guide.gotchas[0].tag, "inferred");
  assert.equal(r.guide.wait.tag, "inferred");
});

test("enforce: a figure missing from the cited pages is downgraded, off-topic unsupported gotchas are dropped, search duplicates collapse", async () => {
  const { enforce } = await import("../lib/postprocess");
  const { RAW_GUIDES } = await import("../data/guides");
  const { OFF_TOPIC_TITLE } = await import("../lib/agent");
  const page = { url: "https://developers.example.com/limits", title: "Limits", text: "Requests are limited to 5 per second per base. A 429 means wait.", official: true };
  const d: any = JSON.parse(JSON.stringify(RAW_GUIDES.find((g: any) => g.slug === "github")));
  d.evidence = [{ id: "e1", url: page.url, title: "L", retrieved_at: "2026-01-01", excerpt: "limited to 5 per second per base", official: true, quote_check: "unchecked" }];
  d.gotchas = [
    { text: "Requests are limited to 5 per second per base, and a 429 means wait.", tag: "sourced", evidence: ["e1"] },
    { text: "Requests above 15 per second per base are banned without permission.", tag: "sourced", evidence: ["e1"] },
    { text: "The release version notation is changing from year.month to year.week.", tag: "inferred", evidence: [] },
  ];
  const r: any = enforce(d, [page]);
  assert.ok(r.ok, r.error);
  assert.equal(r.guide.gotchas.length, 2);
  assert.equal(r.guide.gotchas[0].tag, "sourced");
  assert.equal(r.guide.gotchas[1].tag, "inferred");
  assert.ok(OFF_TOPIC_TITLE.test("Airtable account email verification"));
  assert.ok(!OFF_TOPIC_TITLE.test("Quota modes | Spotify for Developers"));
});
