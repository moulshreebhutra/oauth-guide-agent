import { loadGuides } from "@/lib/guides";

/** Machine-readable index of the library, for agents and other tools. */
export function GET() {
  const guides = loadGuides().map((g) => ({
    slug: g.slug, app: g.app, tier: g.difficulty.tier, difficulty: g.difficulty.label,
    hands_on_minutes: g.effort.hands_on_minutes, wait: { headline: g.wait.headline ?? g.wait.display ?? null, range_days: g.wait.range ?? null, kind: g.wait.kind ?? null, tag: g.wait.tag },
    composio_managed: g.composio_managed.status, last_verified: g.last_verified, url: `/guide/${g.slug}`, json: `/api/guides/${g.slug}`,
  }));
  return Response.json({ count: guides.length, guides, note: "Tags: tested, sourced, reported, inferred, unknown. Quotes are unchecked until verify-quotes is run." }, { headers: { "access-control-allow-origin": "*" } });
}
