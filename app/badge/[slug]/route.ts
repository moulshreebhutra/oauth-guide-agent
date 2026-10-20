import { loadGuide } from "@/lib/guides";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const COLORS: Record<number, string> = { 1: "#0a7a58", 2: "#9a6400", 3: "#cf4519", 4: "#6b2f94" };

/** A small SVG for a README: "Slack OAuth | Review required · up to ~12 weeks". */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = loadGuide(slug);
  if (!g) return new Response("not found", { status: 404 });
  const left = `${g.app.replace(/\s*\(.*\)/, "")} OAuth`;
  const right = `${g.difficulty.label} · ${g.wait.headline ?? g.wait.display ?? "wait not published"}`.slice(0, 60);
  const lw = left.length * 7 + 16, rw = right.length * 6.6 + 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="22" role="img" aria-label="${esc(left)}: ${esc(right)}"><rect width="${lw}" height="22" fill="#0f0f0f"/><rect x="${lw}" width="${rw}" height="22" fill="${COLORS[g.difficulty.tier]}"/><g fill="#fff" font-family="Verdana,Geneva,sans-serif" font-size="11"><text x="8" y="15">${esc(left)}</text><text x="${lw + 8}" y="15">${esc(right)}</text></g></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" } });
}
