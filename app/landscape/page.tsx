import { PageHead } from "@/components/PageHead";
import { COMPETITORS, COMPOSIO_FACTS, LANDSCAPE_TAKEAWAY } from "@/data/landscape";

export const metadata = { title: "Where this fits · OAuth Route Map", description: "What Composio says about managed auth, and how seven alternatives describe theirs." };

export default function Landscape() {
  return (
    <main>
      <PageHead eyebrow="Where this fits" title={<>Composio and <mark className="hl">the alternatives</mark></>} lede="What we read on Composio's site and docs, and how seven other tools describe themselves. Public pages read on 2026-10-20; these are their claims, not ours." />
      <div className="wrap narrow prose">
        <h2>Why Composio is in this project</h2>
        <p>Composio is who this was built for, and it also changes the developer&apos;s question. If Composio can supply the OAuth app, a developer can start without registering one, so the useful guide is the one that says which case you are in, and what happens if you register your own. We use Composio three ways: its toolkit page is a source in each guide, its managed-auth status is shown beside the difficulty, and the live agent reads its setup guide and toolkit page first. Nothing here requires a Composio account or key.</p>
        <h2>What Composio&apos;s pages say</h2>
        {COMPOSIO_FACTS.map((f) => (<div className="finding" key={f.k}><h3>{f.k}</h3><p>{f.v}</p><p className="small"><a href={f.src} target="_blank" rel="noreferrer">Source</a></p></div>))}
        <h2>How seven alternatives describe themselves</h2>
        <div className="cols2">
          {COMPETITORS.map((c) => (<div className="finding" key={c.name}><h3>{c.name}</h3><p>{c.what}</p><p><b>Scale:</b> {c.scale}</p><p><b>Own OAuth app:</b> {c.oauth}</p><p className="small"><a href={c.src} target="_blank" rel="noreferrer">Source</a></p></div>))}
        </div>
        <h2>What this suggests</h2>
        <p>{LANDSCAPE_TAKEAWAY}</p>
      </div>
    </main>
  );
}
