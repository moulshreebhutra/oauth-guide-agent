import type { ReactNode } from "react";
import { decodeEntities } from "@/lib/text";

/**
 * Inline markdown for text the AI wrote: **bold**, *italic*, `code`, [label](https://link) and [e3]-style citations.
 * It builds React elements, never HTML, so nothing from a page or a model can inject markup.
 */
const TOKEN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\[e\d+\]|(?<![\w*])\*[^*\s][^*\n]*\*(?![\w*]))/g;

export function Md({ t }: { t: string | null | undefined }) {
  if (!t) return null;
  const parts = decodeEntities(String(t)).replace(/^\s*#{1,6}\s+/gm, "").split(TOKEN);
  const out: ReactNode[] = parts.map((p, i) => {
    if (i % 2 === 0) return p;
    if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`")) return <code key={i} className="ic">{p.slice(1, -1)}</code>;
    if (/^\[e\d+\]$/.test(p)) return <a key={i} href={`#ev-${p.slice(1, -1)}`} className="cite">{p}</a>;
    if (p.startsWith("[")) {
      const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      return m ? <a key={i} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a> : p;
    }
    if (p.startsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
  return <>{out}</>;
}
