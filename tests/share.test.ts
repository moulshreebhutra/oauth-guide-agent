import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mintShareToken, readShareToken } from "../lib/share";
import type { Guide } from "../lib/schema";

const guide = JSON.parse(readFileSync("data/guides/slack.json", "utf8")) as Guide;
const S = "test-secret-0123456789abcdef";

test("share: round trip returns the same guide", () => {
  const t = mintShareToken(guide, S)!;
  assert.ok(t);
  const r = readShareToken(t, S);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.guide, guide);
});

test("share: no secret means no token and no read", () => {
  assert.equal(mintShareToken(guide, ""), null);
  assert.equal(readShareToken("a.b", "").ok, false);
});

test("share: tampered payload or signature is rejected", () => {
  const t = mintShareToken(guide, S)!;
  const [p, s] = t.split(".");
  const flipped = p.slice(0, -2) + (p.endsWith("A") ? "BB" : "AA");
  assert.equal(readShareToken(`${flipped}.${s}`, S).ok, false);
  assert.equal(readShareToken(`${p}.${s.slice(0, -2)}AA`, S).ok, false);
  assert.equal(readShareToken(t, "another-secret-0123456789").ok, false);
});

test("share: a validly signed but invalid guide is rejected", () => {
  const bad = { ...guide, steps: [] } as unknown as Guide;
  const t = mintShareToken(bad, S)!;
  assert.equal(readShareToken(t, S).ok, false);
});

test("share: malformed tokens do not throw", () => {
  for (const x of ["", "abc", "a.b.c", "....", "%%%.%%%"]) assert.equal(readShareToken(x, S).ok, false);
});
