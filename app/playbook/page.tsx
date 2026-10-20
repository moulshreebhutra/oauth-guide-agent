import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { CHECKLIST, PATTERNS } from "@/data/playbook";

export const metadata = { title: "Playbook · OAuth Route Map", description: "Patterns across ten providers and an eight-question checklist for classifying any app." };

export default function Playbook() {
  return (
    <main>
      <PageHead eyebrow="Playbook" title={<>How to size up <mark className="hl">any app</mark></>} lede="What the ten researched guides have in common, and the eight questions to ask about an app we have not covered. The live agent and Ask use the same patterns as context when they research a new app." />
      <div className="wrap narrow prose">
        <h2>Patterns across the ten guides</h2>
        {PATTERNS.map((p) => (<div className="finding" key={p.title}><h3>{p.title}</h3><p>{p.body}</p></div>))}
        <p className="muted small">These are patterns, not facts about any one provider. Each restates something sourced in a library guide; a specific app always needs its own research.</p>
        <h2>Eight questions for any provider</h2>
        <ol>{CHECKLIST.map((c) => <li key={c}>{c}</li>)}</ol>
        <p><Link className="btn" href="/live">Research an app live</Link></p>
      </div>
    </main>
  );
}
