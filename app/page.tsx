import Link from "next/link";
import { loadGuides } from "@/lib/guides";
import { TIER_LABELS } from "@/lib/schema";
import { RouteMap, type Row } from "@/components/RouteMap";
import { Ask } from "@/components/Ask";
import { Logo } from "@/components/Logo";
import { LOGOS } from "@/lib/logos";
import { Lookup } from "@/components/Lookup";

export default function Home() {
  const guides = loadGuides();
  const rows: Row[] = guides.map((g) => {
    const w = g.wait;
    const kind: Row["waitKind"] = w.kind ?? (w.range ? "stated" : w.tag === "unknown" ? "unpublished" : "none");
    return {
      slug: g.slug,
      managed: g.composio_managed.status,
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
            {guides.length} providers researched
          </p>
          <h1>Know what an OAuth app will cost you <mark className="hl">before you start</mark></h1>
          <p className="lede">
            Connecting your product to Google, LinkedIn or Shopify means registering an app with them, and some providers make you wait for approval. These guides show the effort, the wait, what only you can do, and how sure we are of each.
          </p>
          <Lookup options={guides.map((g) => ({ slug: g.slug, app: g.app }))} />
          <p className="cta-row">
            <Link className="btn ghost" href="/findings">What we found</Link>
            <Link className="btn ghost" href="/how-it-works">How it works</Link>
          </p>
        </div>
      </div>

      <section className="sect white">
        <div className="wrap">
          <div className="sechead">
            <p className="eyebrow">Start here</p>
            <h2>Three things people mix up</h2>
            <p className="lede">Connecting an app for your users involves three separate pieces. Only the first one can make you wait.</p>
          </div>
          <div className="trio">
            <div><b>1</b><h3>The provider's OAuth app</h3><p>The registration at Slack, Google or Shopify that users approve when they connect. This is what a provider may review, and what these guides are about.</p></div>
            <div><b>2</b><h3>Your integration</h3><p>Your product's side: which OAuth app it uses, which permissions it asks for, and where the secrets are stored (never in code).</p></div>
            <div><b>3</b><h3>Your users' connections</h3><p>Each user's own sign-in and consent. One OAuth app serves all of them. Tokens expire, so connections need refreshing.</p></div>
          </div>
          <p className="trio-note"><b>Shortcut:</b> for {guides.filter((g) => g.composio_managed.status === "yes").length} of these {guides.length} providers, Composio can supply the OAuth app (its docs say &quot;Composio-managed OAuth available&quot;), so you can start without registering one. You register your own when you want your own name on the consent screen, custom permissions or your own rate limits.{" "}
            {guides.filter((g) => g.composio_managed.status === "no").map((g) => g.app.replace(/\s*\(.*\)/, "")).join(", ")} is the exception: there you register your own app first.</p>
        </div>
      </section>

      <section className="sect">
        <div className="wrap">
          <div className="sechead">
            <p className="eyebrow">The library</p>
            <h2>Compare {guides.length} providers at a glance</h2>
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
