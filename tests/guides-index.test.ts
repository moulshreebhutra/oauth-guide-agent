import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { GUIDE_FILES } from "../data/guides";

test("every guide json file is registered in data/guides/index.ts", () => {
  const onDisk = readdirSync("data/guides").filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
  assert.deepEqual([...GUIDE_FILES].sort(), onDisk);
});
