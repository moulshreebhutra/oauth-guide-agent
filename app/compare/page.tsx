"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { Logo } from "@/components/Logo";
import { loadGuides } from "@/lib/guides";
import type { Guide } from "@/lib/schema";

export default function ComparePage() {
  const guides = useMemo(() => loadGuides(), []);
  const [sel, setSel] = useState<string[]>(["github", "slack"]);
  useEffect(() => { try { const q = new URLSearchParams(location.search).get("a"); if (q) setSel(q.split(",").filter((s) => guides.some((g) => g.slug === s)).slice(0, 3)); } catch {} }, [guides]);
  const toggle = (slug: string) => {
    const next = sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug].slice(-3);
    setSel(next);
    try { history.replaceState(null, "", next.length ? `?a=${next.join(",")}` : location.pathname); } catch {}
  };
  const chosen = sel.map((s) => guides.find((g) => g.slug === s)!).filter(Boolean) as Guide[];
  const rows: [string, (g: Guide) => string][] = [
    ["Difficulty", (g) => `Tier ${g.difficulty.tier}: ${g.difficulty.label}`],
    ["Why that tier", (g) => g.difficulty.rationale],
    ["Your time (estimate)", (g) => `${g.effort.hands_on_minutes.min}-${g.effort.hands_on_minutes.max} min`],
    ["Approval wait", (g) => `${g.wait.headline ?? g.wait.display ?? "Not published"}. ${g.wait.note ?? ""}`],
    ["Composio can manage the app", (g) => (g.composio_managed.status === "yes" ? "Yes, per Composio's toolkit page" : g.composio_managed.status === "no" ? "No: register your own app first" : "Not confirmed")],
    ["Steps an agent can do or share", (g) => `${g.steps.filter((s) => s.who !== "you").length} of ${g.steps.length}`],
    ["What only you can do", (g) => g.agent_vs_you.you_must.slice(0, 3).join(" ")],
    ["Top gotcha", (g) => g.gotchas[0]?.text ?? "None recorded"],
    ["Biggest open question", (g) => g.uncertainties.find((u) => !/^No hands-on/i.test(u)) ?? "None recorded"],
  ];
  return (
    <main>
      <PageHead center eyebrow="Compare" title={<>Compare providers <mark className="hl">side by side</mark></>} lede="Pick up to three. Every row comes straight from the guides, with the same caveats." />
      <div className="wrap plan">
        <div className="pickgrid">
          {guides.map((g) => (
            <button key={g.slug} type="button" className="pick" aria-pressed={sel.includes(g.slug)} onClick={() => toggle(g.slug)}>
              <Logo slug={g.slug} app={g.app} size={30} /><span>{g.app.replace(/\s*\(.*\)/, "")}</span>
            </button>
          ))}
        </div>
        {chosen.length > 0 && (
          <div className="cmptable" role="table" aria-label="Provider comparison" style={{ ["--n" as string]: chosen.length }}>
            <div className="ct-row ct-head" role="row"><span role="columnheader" />{chosen.map((g) => <span key={g.slug} role="columnheader"><Logo slug={g.slug} app={g.app} size={28} /> <Link href={`/guide/${g.slug}`}>{g.app.replace(/\s*\(.*\)/, "")}</Link></span>)}</div>
            {rows.map(([label, f]) => (
              <div className="ct-row" role="row" key={label}><span className="ct-label" role="rowheader">{label}</span>{chosen.map((g) => <span key={g.slug} role="cell" data-label={g.app.replace(/\s*\(.*\)/, "")}>{f(g)}</span>)}</div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
