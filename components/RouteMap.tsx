"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";

export type Row = {
  slug: string;
  app: string;
  tier: 1 | 2 | 3 | 4;
  label: string;
  time: string; // "10-20 min"
  waitHeadline: string;
  waitNote: string;
  waitKind: "none" | "stated" | "unpublished";
  waitDraw: "range" | "words" | "instant" | "none" | "unknown";
  waitMin?: number; // days
  waitMax?: number; // days
  minMin: number;
  minMax: number;
};

const TIME_MAX = 130; // minutes, linear
const TIME_TICKS = [0, 30, 60, 90, 120];
const WAIT_MAX = 90; // days, log scale
const WAIT_TICKS: [number, string][] = [[1, "1d"], [7, "1wk"], [30, "1mo"], [90, "3mo"]];
const wx = (d: number) => Math.min(1, Math.log10(1 + d) / Math.log10(1 + WAIT_MAX)) * 100;

const TIER_BLURB: Record<number, string> = {
  1: "Register and go. The provider does not approve it first.",
  2: "A few settings or checks to get right.",
  3: "The provider must review it before other companies can use it.",
  4: "Needs approval that can take weeks.",
};
function Meter({ tier }: { tier: number }) {
  return (
    <span className="meter" role="img" aria-label={`Difficulty ${tier} out of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={i <= tier ? "on" : ""} />
      ))}
    </span>
  );
}

function TimeBar({ r }: { r: Row }) {
  const left = (r.minMin / TIME_MAX) * 100;
  const width = Math.max(2.5, ((r.minMax - r.minMin) / TIME_MAX) * 100);
  return (
    <span className="gbar" role="img" aria-label={`${r.minMin} to ${r.minMax} minutes of your time`}>
      {TIME_TICKS.map((t) => <i key={t} className="gl" style={{ left: `${(t / TIME_MAX) * 100}%` }} />)}
      <span className="gfill" style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

function WaitBar({ r }: { r: Row }) {
  const ticks = WAIT_TICKS.map(([d]) => <i key={d} className="gl" style={{ left: `${wx(d)}%` }} />);
  if (r.waitDraw === "none")
    return <span className="gbar" role="img" aria-label="No review step">{ticks}<span className="gpill ok">No review step</span></span>;
  if (r.waitDraw === "unknown")
    return <span className="gbar" role="img" aria-label="No time published">{ticks}<span className="gdash">? No time published</span></span>;
  if (r.waitDraw === "instant")
    return <span className="gbar" role="img" aria-label="Minutes">{ticks}<span className="gfill" style={{ left: 0, width: "2.5%" }} /><span className="gnote">minutes, not days</span></span>;
  if (r.waitDraw === "words")
    return <span className="gbar" role="img" aria-label="Stated in words only">{ticks}<span className="gfill hatched" style={{ left: `${wx(14)}%`, width: `${100 - wx(14)}%` }} /><span className="gnote on">stated in words, no number</span></span>;
  const l = wx(r.waitMin ?? 0), w = Math.max(2.5, wx(r.waitMax ?? 0) - l);
  return <span className="gbar" role="img" aria-label={`${r.waitMin} to ${r.waitMax} days`}>{ticks}<span className="gfill" style={{ left: `${l}%`, width: `${w}%` }} /></span>;
}

export function RouteMap({ rows }: { rows: Row[] }) {
  const [tier, setTier] = useState<number>(0);
  const shown = rows.filter((r) => !tier || r.tier === tier);
  const opts: [number, string][] = [[0, "All"], [1, "Self-serve"], [2, "Light checks"], [3, "Review required"], [4, "Gated"]];

  return (
    <section className="map" aria-label="Compare providers">
      <div className="map-head">
        <h2>Compare the ten providers</h2>
        <div className="chips" role="group" aria-label="Show providers by difficulty">
          {opts.map(([t, l]) => (
            <button key={t} type="button" className="chip" aria-pressed={tier === t} onClick={() => setTier(t)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="cmp cmphdr" aria-hidden>
        <span>App</span>
        <span>Difficulty<em>How much stands between you and a working app</em></span>
        <span>Your hands-on time<em>Our estimate, clicking and copying only</em>
          <span className="ticks">{TIME_TICKS.filter((t) => t % 60 === 0).map((t) => <b key={t} style={{ left: `${(t / TIME_MAX) * 100}%` }}>{t === 120 ? "120 min" : t}</b>)}</span>
        </span>
        <span>Approval wait<em>As the provider states it, after you submit</em>
          <span className="ticks">{WAIT_TICKS.map(([d, l]) => <b key={d} style={{ left: `${wx(d)}%` }}>{l}</b>)}</span>
        </span>
      </div>

      {shown.map((r) => (
        <Link key={r.slug} href={`/guide/${r.slug}`} className="cmp cmprow">
          <span className="c-app"><Logo slug={r.slug} app={r.app} /><b>{r.app}</b></span>
          <span className="c-diff" data-label="Difficulty">
            <span className="diffhead"><Meter tier={r.tier} /><strong>{r.label}</strong></span>
            <small>{TIER_BLURB[r.tier]}</small>
          </span>
          <span className="c-time" data-label="Your hands-on time">
            <strong>{r.time}</strong>
            <TimeBar r={r} />
          </span>
          <span className={`c-wait wk-${r.waitKind}`} data-label="Approval wait">
            <strong>{r.waitHeadline}</strong>
            <WaitBar r={r} />
            <small>{r.waitNote}</small>
          </span>
        </Link>
      ))}

      <div className="howto">
        <b>How to read the bars</b>
        <ul>
          <li><b>Your hands-on time:</b> the bar spans our low and high estimate on a 0 to 120 minute scale. It excludes waiting.</li>
          <li><b>Approval wait:</b> the bar spans the range the provider states, on a scale that stretches the short end (1 day, 1 week, 1 month, 3 months), because most waits are short and a few are long.</li>
          <li><b>Hatched bar:</b> the provider says &quot;several weeks&quot; or similar without a number. <b>Dashed box with ?:</b> we looked and found no time, and we do not guess one. <b>Green pill:</b> no review step is described.</li>
        </ul>
      </div>
    </section>
  );
}
