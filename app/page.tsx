import Link from "next/link";
import { loadGuides } from "@/lib/guides";
import { TIER_LABELS } from "@/lib/schema";
import { RouteMap, type Row } from "@/components/RouteMap";
import { Ask } from "@/components/Ask";
import { PageHead } from "@/components/PageHead";

export default function Home() {
  const rows: Row[] = loadGuides().map((g) => {
    const w = g.wait;
    const kind: Row["waitKind"] = w.display ? (w.range && w.range.max_days > 0 ? "range" : w.range ? "range" : "words") : w.range ? "range" : w.tag === "unknown" ? "unknown" : "none-stated";
    const text = w.display ?? (w.range && w.range.max_days > 0 ? `${w.range.min_days}-${w.range.max_days} days` : w.tag === "unknown" ? "Not published" : "No review step described");
    return {
      slug: g.slug,
      app: g.app,
      tier: g.difficulty.tier,
      label: TIER_LABELS[g.difficulty.tier],
      minMin: g.effort.hands_on_minutes.min,
      minMax: g.effort.hands_on_minutes.max,
      waitKind: w.display && !w.range ? "words" : kind,
      waitMin: w.range?.min_days,
      waitMax: w.range?.max_days,
      waitText: text,
    };
  });
  return (
    <main>
      <PageHead
        eyebrow="OAuth app setup, with the approval wait included"
        title={<>Know what an OAuth app will cost you <mark className="hl">before you start</mark></>}
        lede="Connecting your product to Google, LinkedIn or Shopify means registering an app with them, and some providers make you wait for approval. These guides show the effort, the wait, what only you can do, and how sure we are of each."
      >
        <p className="cta-row">
          <Link className="btn" href="/live">Research an app that is not here</Link>
          <Link className="btn ghost" href="/how-it-works">How this works</Link>
        </p>
      </PageHead>
      <div className="wrap">
      <RouteMap rows={rows} />
      <Ask examples={["Which providers need a review before other companies can use my app?", "How long does Google verification take?", "What can an agent do for me on Shopify?"]} />
      </div>
    </main>
  );
}
