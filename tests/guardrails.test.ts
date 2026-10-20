import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { excerptAppearsIn, assertSafeUrl, cleanAppInput, rateLimit } from "../lib/safety";
import { enforce, type Fetched } from "../lib/postprocess";

const page = "A user or organization can own up to 100 OAuth apps.\n\nYou can enter up to 10 callback URLs.";

test("excerpt matching tolerates whitespace/case/curly quotes, rejects invented text", () => {
  assert.ok(excerptAppearsIn("can own up to  100 OAuth apps", page));
  assert.ok(!excerptAppearsIn("can own up to 500 OAuth apps", page));
  assert.ok(!excerptAppearsIn("100", page)); // too short to count as evidence
});

test("SSRF: blocks private, loopback, metadata, bad schemes", async () => {
  for (const u of ["http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/", "http://localhost/", "file:///etc/passwd", "http://[::1]/", "https://user:pw@example.com/", "http://example.com:8080/"])
    await assert.rejects(() => assertSafeUrl(u), /./, u);
  await assert.doesNotReject(() => assertSafeUrl("https://93.184.216.34/"));
});

test("input cleaning", () => {
  assert.deepEqual(cleanAppInput("https://www.Example.com/path"), { name: "Example.com".toLowerCase() === "example.com" ? "Example.com" : "", site: "Example.com" });
  assert.equal(cleanAppInput("<script>"), null);
  assert.equal(cleanAppInput("x"), null);
  assert.deepEqual(cleanAppInput("Linear"), { name: "Linear" });
});

test("rate limit", () => {
  for (let i = 0; i < 3; i++) assert.ok(rateLimit("k", 3));
  assert.ok(!rateLimit("k", 3));
});

test("enforce: fabricated quote is dropped and claim downgraded; 'tested' is refused", () => {
  const g = JSON.parse(fs.readFileSync("data/guides/github.json", "utf8"));
  g.generated_by = "agent";
  g.evidence = [
    { ...g.evidence[0], url: "https://docs.github.com/x", excerpt: "A user or organization can own up to 100 OAuth apps." },
    { ...g.evidence[1], url: "https://docs.github.com/x", excerpt: "GitHub approves every OAuth app within 3 days." }, // invented
  ];
  g.requirements[0].evidence = ["e2"]; g.requirements[0].tag = "sourced";
  g.gotchas[0].tag = "tested"; g.gotchas[0].evidence = [];
  const fetched: Fetched[] = [{ url: "https://docs.github.com/x", title: "GH", text: page, official: true }];
  const r = enforce(g, fetched);
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (r.ok) {
    assert.equal(r.guide.evidence.length, 1);
    assert.equal(r.guide.evidence[0].quote_check, "verified");
    assert.equal(r.guide.requirements[0].tag, "inferred");
    assert.equal(r.guide.gotchas[0].tag, "inferred");
    assert.equal(r.guide.tested_log.length, 0);
  }
});

test("enforce: evidence from a URL never fetched is dropped", () => {
  const g = JSON.parse(fs.readFileSync("data/guides/github.json", "utf8"));
  const r = enforce(g, []);
  if (r.ok) assert.equal(r.guide.evidence.length, 0);
  else assert.ok(r.error.length > 0);
});

import { search, chunkGuide, buildIndex, checkCitations } from "../lib/rag";
import { loadGuides } from "../lib/guides";
const ix = buildIndex(loadGuides().flatMap(chunkGuide));

test("RAG: relevant guide ranks first for app-specific questions", () => {
  assert.equal(search("how long does Google verification take", { index: ix })[0].slug, "google-workspace");
  assert.equal(search("does LinkedIn api access need approval", { index: ix })[0].slug, "linkedin");
  assert.equal(search("Salesforce connected app disabled by default", { index: ix })[0].slug, "salesforce");
});
test("RAG: off-topic question retrieves nothing; slug scoping holds", () => {
  assert.equal(search("best pizza recipe in naples", { index: ix }).length, 0);
  assert.ok(search("review", { index: ix, slug: "slack" }).every((h) => h.slug === "slack"));
});
test("RAG: citation checker rejects ids that were not retrieved", () => {
  const r = checkCitations("Yes [slack#2] and also [made-up#9]", new Set(["slack#2"]));
  assert.deepEqual(r.cited, ["slack#2"]);
  assert.deepEqual(r.invalid, ["made-up#9"]);
});
