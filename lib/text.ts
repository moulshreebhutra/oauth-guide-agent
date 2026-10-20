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
