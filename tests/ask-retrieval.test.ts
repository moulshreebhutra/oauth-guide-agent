import test from "node:test";
import assert from "node:assert/strict";
import { loadGuides } from "../lib/guides";
import { search } from "../lib/rag";
import { extractApp } from "../lib/webask";
import { parseComposioToolkit } from "../lib/tools";

for (const g of loadGuides()) {
  const name = g.app.replace(/\s*\(.*\)/, "");
  test(`Ask: "${name}" alone returns that guide's overview`, () => {
    const hits = search(name, { k: 10 });
    assert.ok(hits.length >= 6, `${name}: only ${hits.length} passages`);
    assert.ok(hits.every((h) => h.slug === g.slug), `${name}: passages from other guides`);
    assert.equal(hits[0].section, "Summary");
  });
  test(`Ask: "tell me everything about ${name}" covers the whole guide`, () => {
    const hits = search(`tell me everything about ${name} integration`, { k: 10 });
    assert.ok(new Set(hits.map((h) => h.section)).size >= 6);
    assert.ok(hits.every((h) => h.slug === g.slug));
  });
  test(`Ask: approval wait question for ${name} reaches its guide`, () => {
    const hits = search(`how long does ${name} approval take`, { k: 6 });
    assert.ok(hits.some((h) => h.slug === g.slug));
  });
}

test("Ask: broad question spans providers", () => {
  const slugs = new Set(search("Which providers need a review before other companies can use my app?", { k: 8 }).map((h) => h.slug));
  assert.ok(slugs.size >= 3);
});
test("Ask: off-topic question finds nothing", () => assert.equal(search("What is the capital of France?", { k: 5 }).length, 0));

test("extractApp finds the app in free-form questions", () => {
  assert.equal(extractApp("zoom"), "zoom");
  assert.equal(extractApp("How do I register an OAuth app for Zoom?"), "Zoom");
  assert.equal(extractApp("how long does Linear approval take"), "Linear");
  assert.equal(extractApp("what does linear.app need to approve my app"), "linear.app");
  assert.equal(extractApp("what is a refresh token"), undefined);
});
test("Composio toolkit page parser", () => {
  assert.deepEqual(parseComposioToolkit("Authentication Details OAuth2 Composio-managed OAuth available"), { status: "yes", methods: ["OAuth2"] });
  assert.equal(parseComposioToolkit("OAuth2 S2S_OAUTH2 Composio-managed OAuth not available").status, "no");
  assert.equal(parseComposioToolkit("nothing here").status, "unknown");
});
