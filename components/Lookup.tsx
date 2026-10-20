"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ask } from "./Ask";

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
  const [asked, setAsked] = useState("");
  // a sentence rather than an app name or website is a question for the Ask engine
  const isQuestion = (v: string) => !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) && (/\?\s*$/.test(v) || v.split(/\s+/).length >= 4 || /^(how|what|which|why|when|can|does|do|is|are|should)\b/i.test(v));
  const asking = isQuestion(q.trim());
  const match = asking ? undefined : hit(q);

  return (
    <>
    <form
      className="lookup"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v.length < 2) return;
        const m = hit(v);
        if (isQuestion(v)) { setAsked(""); setTimeout(() => setAsked(v), 0); return; }
        router.push(m ? `/guide/${m.slug}` : `/live?app=${encodeURIComponent(v)}&go=1`);
      }}
    >
      <label htmlFor="lookup-in" className="sr">Look up an app by name or website</label>
      <input id="lookup-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="App name, website or a question" maxLength={120} list="lookup-apps" autoComplete="off" />
      <datalist id="lookup-apps">{options.map((o) => <option key={o.slug} value={o.app.replace(/\s*\(.*\)/, "")} />)}</datalist>
      <button className="btn" disabled={q.trim().length < 2}>{asking ? "Ask" : match ? "Open guide" : "Research it live"}</button>
      <p className="fine">{q.trim().length < 2 ? "In the library: GitHub, Notion, HubSpot, Salesforce, Microsoft, Shopify, Slack, Google, LinkedIn, Meta. Anything else is researched live." : asking ? "Looks like a question. It is answered from the guides, or researched live for other apps." : match ? `${match.app.replace(/\s*\(.*\)/, "")} is in the library.` : "Not in the library. The agent will research it and write a guide in about two minutes."}</p>
    </form>
    {asked && <div className="lookask"><Ask bare initial={asked} key={asked} examples={[]} /></div>}
    </>
  );
}
