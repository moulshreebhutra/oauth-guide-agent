import type { Hit } from "./rag";

/**
 * The always-available answer writer. No model, no network: it builds a readable, cited summary from the retrieved passages.
 * It only ever rearranges the guides' own sentences, so nothing can be invented, and it carries the evidence tag
 * ("our estimate", "not stated") so a weak claim never reads like a firm one.
 */
const clean = (h: Hit) => h.text.replace(/^[^.]{1,60}\.\s/, "").replace(/\s+/g, " ").trim();
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z"(])/).filter(Boolean);
const brief = (t: string, max = 260) => {
  let out = "";
  for (const s of sentences(t)) {
    const next = (out + " " + s).trim();
    if (out && next.length > max * 1.4) break;
    out = next;
    if (out.length >= max * 0.5) break;
  }
  return out.length > max * 1.4 ? out.slice(0, max).trimEnd() + "…" : out;
};
const note = (tag?: string | null) => (tag === "inferred" ? " (our estimate)" : tag === "unknown" ? " (not stated by the provider)" : tag === "reported" ? " (reported, not official)" : "");
const line = (label: string, h: Hit, max?: number) => `- **${label}:** ${brief(clean(h), max)}${note(h.tag)} [${h.id}]`;

export function compose(hits: Hit[]): { text: string; cited: string[] } {
  if (!hits.length) return { text: "", cited: [] };
  const slugs = [...new Set(hits.map((h) => h.slug))];
  const used: Hit[] = [];
  const out: string[] = [];

  if (slugs.length === 1) {
    const app = hits[0].app;
    const bySection = new Map<string, Hit>();
    for (const h of hits) {
      const key = h.section.startsWith("Step ") ? "Steps" : h.section;
      if (!bySection.has(key)) bySection.set(key, h);
    }
    // a whole-guide overview arrives in reading order (Summary, Difficulty, ...); a specific question arrives ranked by relevance
    const overview = bySection.size >= 6 && hits[0].section === "Summary" && hits[1]?.section === "Difficulty";
    out.push(overview ? `Here is what the ${app} guide says, section by section:` : `Most relevant parts of the ${app} guide:`);
    const order = overview ? [...bySection.entries()] : [...bySection.entries()].slice(0, 5);
    for (const [label, h] of order) {
      out.push(line(label === "Source quote" ? "Quoted from the provider" : label, h, overview ? 200 : 300));
      used.push(h);
    }
  } else {
    out.push("Here is what the guides say, provider by provider:");
    for (const slug of slugs.slice(0, 6)) {
      const h = hits.find((x) => x.slug === slug)!;
      out.push(line(h.app.replace(/\s*\(.*\)/, ""), h, 230));
      used.push(h);
    }
  }
  return { text: out.join("\n"), cited: used.map((h) => h.id) };
}
