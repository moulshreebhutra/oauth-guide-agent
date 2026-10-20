import Link from "next/link";
import { loadGuides } from "@/lib/guides";
import { TIER_LABELS } from "@/lib/schema";
import { RouteMap, type Row } from "@/components/RouteMap";
import { Ask } from "@/components/Ask";
import { Logo } from "@/components/Logo";
import { LOGOS } from "@/lib/logos";

export default function Home() {
  const guides = loadGuides();
  const rows: Row[] = guides.map((g) => {
    const w = g.wait;
    const kind: Row["waitKind"] = w.kind ?? (w.range ? "stated" : w.tag === "unknown" ? "unpublished" : "none");
    return {
      slug: g.slug,
      app: g.app.replace(/\s*\(.*\)/, ""),
      tier: g.difficulty.tier,
      label: TIER_LABELS[g.difficulty.tier],
      time: `${g.effort.hands_on_minutes.min}-${g.effort.hands_on_minutes.max} min`,
      waitHeadline: w.headline ?? w.display ?? (w.range ? `${w.range.min_days}-${w.range.max_days} days` : "Not published"),
      waitNote: w.note ?? w.statement,
      waitKind: kind,
      waitDraw: kind === "none" ? "none" : kind === "unpublished" ? "unknown" : w.range && w.range.max_days > 0 ? "range" : w.range || /minute/i.test(w.headline ?? "") ? "instant" : "words",
      waitMin: w.range?.min_days,
      waitMax: w.range?.max_days,
      minMin: g.effort.hands_on_minutes.min,
      minMax: g.effort.hands_on_minutes.max,
    };
  });
  return (
    <main>
      <div className="band hero center">
        <span className="stripes" aria-hidden />
        <div className="wrap">
          <p className="pillrow">
            <span className="logos">
              {guides.filter((g) => LOGOS[g.slug]).slice(0, 6).map((g) => <Logo key={g.slug} slug={g.slug} app={g.app} size={24} />)}
            </span>
            10 providers researched
          </p>
          <h1>Know what an OAuth app will cost you <mark className="hl">before you start</mark></h1>
          <p className="lede">
            Connecting your product to Google, LinkedIn or Shopify means registering an app with them, and some providers make you wait for approval. These guides show the effort, the wait, what only you can do, and how sure we are of each.
          </p>
          <p className="cta-row">
            <Link className="btn" href="/live">Research an app that is not here</Link>
            <Link className="btn ghost" href="/how-it-works">How this works</Link>
          </p>
        </div>
      </div>

      <section className="sect">
        <div className="wrap">
          <div className="sechead">
            <p className="eyebrow">The library</p>
            <h2>Compare ten providers at a glance</h2>
            <p className="lede">Pick a provider to see the full guide, or sort to find the fastest one to launch.</p>
          </div>
          <RouteMap rows={rows} />
        </div>
      </section>

      <section className="sect dark">
        <div className="wrap">
          <Ask examples={["Which providers need a review before other companies can use my app?", "How long does Google verification take?", "What can an agent do for me on Shopify?"]} />
        </div>
      </section>
    </main>
  );
}
