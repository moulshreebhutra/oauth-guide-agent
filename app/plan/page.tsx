"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { Logo } from "@/components/Logo";
import { loadGuides } from "@/lib/guides";
import { buildPlan, rowOf } from "@/lib/plan";

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function PlanPage() {
  const guides = useMemo(() => loadGuides(), []);
  const [sel, setSel] = useState<string[]>([]);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    try { const q = new URLSearchParams(location.search).get("p"); if (q) setSel(q.split(",").filter((s) => guides.some((g) => g.slug === s))); } catch {}
  }, [guides]);
  const toggle = (slug: string) => {
    const next = sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug];
    setSel(next);
    try { history.replaceState(null, "", next.length ? `?p=${next.join(",")}` : location.pathname); } catch {}
  };
  const plan = today ? buildPlan(guides.filter((g) => sel.includes(g.slug)).map(rowOf), today) : null;
  const h = (n: number) => (n < 1 ? `${Math.round(n * 60)} min` : `${n.toFixed(1)} h`);
  return (
    <main>
      <PageHead center eyebrow="Launch planner" title={<>When can you <mark className="hl">launch</mark>?</>} lede="Pick the providers your product needs. The planner adds up your setup time, finds the provider that sets the date, and tells you what to start first. It only uses numbers the guides state; an unpublished wait stays unknown." />
      <div className="wrap narrow plan">
        <h2>Which apps do your users need?</h2>
        <div className="pickgrid">
          {guides.map((g) => (
            <button key={g.slug} type="button" className="pick" aria-pressed={sel.includes(g.slug)} onClick={() => toggle(g.slug)}>
              <Logo slug={g.slug} app={g.app} size={30} /><span>{g.app.replace(/\s*\(.*\)/, "")}</span>
            </button>
          ))}
        </div>

        {plan && sel.length > 0 && (
          <>
            <div className="finding verdict">
              <h3>Earliest launch: {fmt(plan.earliest)} · Latest: {plan.latest ? fmt(plan.latest) : "unknown"}</h3>
              <p>If you start today. Your setup: about {h(plan.handsOnHours.min)} to {h(plan.handsOnHours.max)} in total. Longest provider wait: {plan.waitDays.max === null ? `at least ${plan.waitDays.min} days, upper bound unknown` : `${plan.waitDays.min} to ${plan.waitDays.max} days`}.</p>
            </div>
            <h2>Start in this order</h2>
            <ol className="order">
              {plan.startOrder.map((r) => (
                <li key={r.slug}>
                  <Logo slug={r.slug} app={r.app} size={34} />
                  <div><b>{r.app}</b> <span className="muted small">tier {r.tier}</span>
                    <p className="small">Your setup {r.setupMin}-{r.setupMax} min · Provider wait: <b>{r.headline}</b>{r.waitMaxDays === null && " (no time published)"}</p></div>
                  <Link className="btn ghost" href={`/guide/${r.slug}`}>Open guide</Link>
                </li>
              ))}
            </ol>
            <h2>Read this before you plan around it</h2>
            <ul>{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </>
        )}
        {sel.length === 0 && <p className="muted">Select one or more providers above. The link in your address bar updates, so you can share the plan.</p>}
      </div>
    </main>
  );
}
