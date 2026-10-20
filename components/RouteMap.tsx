"use client";
import Link from "next/link";
import { useState } from "react";

export type Row = {
  slug: string;
  app: string;
  tier: 1 | 2 | 3 | 4;
  label: string;
  minMin: number;
  minMax: number;
  waitKind: "range" | "words" | "none-stated" | "unknown";
  waitMin?: number;
  waitMax?: number;
  waitText: string;
};

const TIME_MAX = 130; // minutes on the time axis
const WAIT_MAX = 90; // days
const x = (d: number) => Math.min(1, Math.log10(1 + d) / Math.log10(1 + WAIT_MAX)); // wait axis: 0..90 days, log scale

const LINES: Record<number, string> = { 1: "Self-serve", 2: "Light checks", 3: "Review required", 4: "Gated" };

export function RouteMap({ rows }: { rows: Row[] }) {
  const [on, setOn] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const toggle = (t: number) =>
    setOn((s) => {
      const n = new Set(s);
      n.has(t) ? n.delete(t) : n.add(t);
      return n.size ? n : new Set([1, 2, 3, 4]);
    });
  const shown = rows.filter((r) => on.has(r.tier));

  return (
    <section className="map" aria-label="Approval route map">
      <div className="map-head">
        <h2>Ten providers, side by side</h2>
        <div className="chips" role="group" aria-label="Filter by difficulty tier">
          {[1, 2, 3, 4].map((t) => (
            <button key={t} type="button" className={`chip line-${t}`} aria-pressed={on.has(t)} onClick={() => toggle(t)}>
              <i /> {LINES[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="maprow maphdr" aria-hidden>
        <span>App</span>
        <span>Your hands-on time <em>(our estimate)</em></span>
        <span>Approval wait <em>(what providers state)</em></span>
      </div>

      {shown.map((r) => (
        <Link key={r.slug} href={`/guide/${r.slug}`} className={`maprow line-${r.tier}`}>
          <span className="who">
            <i className="dot" />
            <b>{r.app}</b>
            <small>{r.label}</small>
          </span>

          <span className="bar time" title={`${r.minMin}-${r.minMax} minutes`}>
            <span className="axis" />
            <span className="fill" style={{ left: `${(r.minMin / TIME_MAX) * 100}%`, width: `${Math.max(3, ((r.minMax - r.minMin) / TIME_MAX) * 100)}%` }} />
            <small>{r.minMin}-{r.minMax} min</small>
          </span>

          <span className={`bar wait wait-${r.waitKind}`} title={r.waitText}>
            <span className="axis" />
            {r.waitKind === "range" && r.waitMax! > 0 && (
              <span className="fill" style={{ left: `${x(r.waitMin!) * 100}%`, width: `${Math.max(3, (x(r.waitMax!) - x(r.waitMin!)) * 100)}%` }} />
            )}
            {r.waitKind === "range" && r.waitMax === 0 && <span className="tick" />}
            {r.waitKind === "words" && <span className="fill hatched" style={{ left: "35%", width: "65%" }} />}
            {r.waitKind === "none-stated" && <span className="tick" />}
            <small>{r.waitText}</small>
          </span>
        </Link>
      ))}

      <p className="legend">
        Solid bar: a duration a provider states. Hatched: stated in words with no number. Dotted line: not published, and we do not guess. The wait axis runs 0 to 90 days on a log scale; the time axis runs 0 to {TIME_MAX} minutes.
      </p>
    </section>
  );
}
