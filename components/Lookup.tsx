"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Opt = { slug: string; app: string };

/** One box for "an app I care about": opens the library guide if we have it, otherwise sends it to the live agent. */
export function Lookup({ options }: { options: Opt[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = (v: string) => {
    const n = norm(v);
    if (n.length < 2) return undefined;
    return options.find((o) => norm(o.app).includes(n) || norm(o.slug).includes(n) || (n.length > 3 && n.includes(norm(o.app.replace(/\s*\(.*\)/, "")))));
  };
  const match = hit(q);
  return (
    <form
      className="lookup"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v.length < 2) return;
        const m = hit(v);
        router.push(m ? `/guide/${m.slug}` : `/live?app=${encodeURIComponent(v)}`);
      }}
    >
      <label htmlFor="lookup-in" className="sr">Look up an app by name or website</label>
      <input id="lookup-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Look up an app: Slack, Zoom, linear.app…" maxLength={120} list="lookup-apps" autoComplete="off" />
      <datalist id="lookup-apps">{options.map((o) => <option key={o.slug} value={o.app.replace(/\s*\(.*\)/, "")} />)}</datalist>
      <button className="btn" disabled={q.trim().length < 2}>{match ? "Open guide" : "Research it live"}</button>
      <p className="fine">{q.trim().length < 2 ? "In the library: GitHub, Notion, HubSpot, Salesforce, Microsoft, Shopify, Slack, Google, LinkedIn, Meta. Anything else is researched live." : match ? `${match.app.replace(/\s*\(.*\)/, "")} is in the library.` : "Not in the library. The agent will research it and write a guide in about a minute."}</p>
    </form>
  );
}
