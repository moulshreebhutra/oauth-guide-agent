/* Scale-out: research many apps with the same agent the website uses, and save each guide for human review.
   Usage (needs GEMINI_API_KEY and open internet; never commit the key):
     ANTHROPIC_API_KEY=... TAVILY_API_KEY=... npx tsx scripts/batch-generate.ts "Linear" "Zoom" "Dropbox"
     ANTHROPIC_API_KEY=... TAVILY_API_KEY=... npx tsx scripts/batch-generate.ts --file apps.txt        (one app name or website per line)
   Output: data/guides/_generated/<slug>.json (not shown on the site until a person reviews it and moves it to data/guides). */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateGuide } from "../lib/agent";
import { cleanAppInput } from "../lib/safety";

async function main() {
  const args = process.argv.slice(2);
  const fi = args.indexOf("--file");
  const apps = fi >= 0 ? readFileSync(args[fi + 1], "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : args;
  if (!apps.length) { console.error("Give app names, or --file apps.txt"); process.exit(1); }
  mkdirSync("data/guides/_generated", { recursive: true });
  let ok = 0;
  for (const a of apps) {
    const input = cleanAppInput(a);
    if (!input) { console.log(`skip  ${a} (not a valid name or site)`); continue; }
    process.stdout.write(`...   ${a}\n`);
    let done = false;
    for await (const ev of generateGuide(input)) {
      if (ev.type === "guide") {
        writeFileSync(`data/guides/_generated/${ev.guide.slug}.json`, JSON.stringify(ev.guide, null, 2) + "\n");
        console.log(`saved ${ev.guide.slug}  tier ${ev.guide.difficulty.tier}  (${ev.notes.length} guardrail note(s))`);
        ok++; done = true;
      } else if (ev.type === "error") { console.log(`FAIL  ${a}: ${ev.msg.slice(0, 160)}`); done = true; }
    }
    if (!done) console.log(`FAIL  ${a}: no result`);
    await new Promise((r) => setTimeout(r, 4000)); // stay under free-tier rate limits
  }
  console.log(`\n${ok}/${apps.length} guides saved to data/guides/_generated for review`);
}
main();
