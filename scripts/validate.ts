import fs from "node:fs";
import path from "node:path";
import { Guide, lintGuide } from "../lib/schema";

const dir = path.join(process.cwd(), "data/guides");
let bad = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const r = Guide.safeParse(raw);
  if (!r.success) {
    bad++;
    console.log(`✗ ${f}: schema`, r.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "));
    continue;
  }
  const problems = lintGuide(r.data);
  if (problems.length) {
    bad++;
    console.log(`✗ ${f}:`, problems.join("; "));
  } else console.log(`✓ ${f} (tier ${r.data.difficulty.tier}, ${r.data.evidence.length} evidence)`);
}
process.exit(bad ? 1 : 0);
