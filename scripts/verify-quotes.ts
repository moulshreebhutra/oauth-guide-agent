/**
 * Re-checks every evidence excerpt in data/guides/*.json against the live page text.
 * Run from a machine with open internet access:  npm run verify-quotes
 * Writes quote_check = verified | failed back into the JSON (never edits excerpts).
 */
import fs from "node:fs";
import path from "node:path";
import { fetchPage } from "../lib/tools";
import { excerptAppearsIn } from "../lib/safety";

const dir = path.join(process.cwd(), "data/guides");
(async () => {
  let failed = 0;
  const cache = new Map<string, string | null>();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const p = path.join(dir, f);
    const g = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const e of g.evidence) {
      if (!cache.has(e.url)) {
        try { cache.set(e.url, (await fetchPage(e.url)).text); } catch (err: any) { console.log(`  fetch failed ${e.url}: ${err.message}`); cache.set(e.url, null); }
      }
      const text = cache.get(e.url);
      if (text == null) continue; // leave 'unchecked'
      e.quote_check = excerptAppearsIn(e.excerpt, text) ? "verified" : "failed";
      if (e.quote_check === "failed") failed++;
      console.log(`${e.quote_check === "verified" ? "✓" : "✗"} ${f} ${e.id} ${e.url}`);
    }
    fs.writeFileSync(p, JSON.stringify(g, null, 1) + "\n");
  }
  console.log(failed ? `${failed} excerpt(s) NOT found - fix the quote or the claim.` : "All reachable excerpts verified.");
  process.exit(failed ? 1 : 0);
})();
