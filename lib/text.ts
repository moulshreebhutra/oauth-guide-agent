/** Small text helpers shared by the server and the pages. */

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "-", mdash: "-", hellip: "..." };

/** &#039; &#x27; &amp; and friends -> the real characters. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ""; })
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

/** Plain text for previews: entities decoded, markdown links reduced to their label, heading marks, bold and code marks removed. */
export function cleanText(s: string): string {
  return decodeEntities(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)\s]*\)/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A readable name for a source whose title is only its address. */
export function prettyTitle(title: string, url: string): string {
  if (title && !/^https?:\/\//i.test(title.trim())) return decodeEntities(title);
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").filter(Boolean).slice(-2).join(" / ").replace(/[-_]+/g, " ");
    return `${u.hostname.replace(/^www\./, "")}${tail ? ": " + tail : ""}`;
  } catch { return title || url; }
}

const KEY = /review|approv|verif|scope|permission|redirect|token|business|requir|access|submit|publish|\b\d+\s*(days?|weeks?|hours?|minutes?)\b|\bfees?\b|free|paid|rate limit|oauth|client (id|secret)|managed|partner|production|development|app (creation|registration)|register/i;
const NOISE = /([A-Z]+_){2,}[A-Z]+|Copy page|Skip to (main )?content|Documentation Index|Fetch the complete|All Toolkits|Latest version|cookie|sign in to|log in to/;

/** The few sentences of a page that matter for OAuth setup, as plain text. Used for the agent's "what it found" previews. */
export function keyFacts(text: string, n = 3): string[] {
  const sentences: string[] = [];
  for (const line of text.split(/\n+/)) {
    const c = cleanText(line);
    if (c.length < 40) continue;
    for (const s of c.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)) { const t = s.trim(); if (t.length >= 45 && t.length <= 400 && !NOISE.test(t)) sentences.push(t); }
  }
  const cut = (t: string) => t.length <= 240 ? t : t.slice(0, 240).replace(/\s+\S*$/, "") + "...";
  const scored = sentences.map((t, i) => ({ t, i, sc: (t.match(new RegExp(KEY.source, "gi")) ?? []).length })).filter((x) => x.sc > 0);
  const top = (scored.length ? scored.sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, n).sort((a, b) => a.i - b.i) : sentences.slice(0, 2).map((t, i) => ({ t, i, sc: 0 })));
  return [...new Set(top.map((x) => cut(x.t)))];
}
