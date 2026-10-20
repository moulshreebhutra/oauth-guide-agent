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

type Sev = { rank: number; word: string; cls: string };
function severity(r: Row): Sev {
  if (r.waitDraw === "none") return { rank: 0, word: "No wait", cls: "s-none" };
  if (r.waitDraw === "instant") return { rank: 1, word: "Minutes", cls: "s-min" };
  if (r.waitDraw === "unknown") return { rank: 5, word: "No time published", cls: "s-unk" };
  if (r.waitDraw === "range") {
    const m = r.waitMax ?? 0;
    return m <= 14 ? { rank: 2, word: "Days", cls: "s-days" } : { rank: 3, word: "Weeks", cls: "s-weeks" };
  }
  return { rank: 4, word: "Weeks", cls: "s-weeks" }; // stated in words ("several weeks")
}

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

export function RouteMap({ rows }: { rows: Row[] }) {
  const [tier, setTier] = useState<number>(0);
  const [sort, setSort] = useState<"default" | "fast" | "slow">("default");
  const opts: [number, string][] = [[0, "All"], [1, "Self-serve"], [2, "Light checks"], [3, "Review required"], [4, "Gated"]];
  const shown = rows
    .filter((r) => !tier || r.tier === tier)
    .sort((a, b) => {
      if (sort === "default") return 0;
      const d = severity(a).rank - severity(b).rank || a.minMax - b.minMax;
      return sort === "fast" ? d : -d;
    });

  return (
    <section className="map" aria-label="Compare providers">
      <div className="map-head">
        <h2>Show</h2>
        <div className="chips" role="group" aria-label="Show providers by difficulty">
          {opts.map(([t, l]) => (
            <button key={t} type="button" className="chip" aria-pressed={tier === t} onClick={() => setTier(t)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="sortbar">
        <span>Order by</span>
        {([["default", "Library order"], ["fast", "Fastest to launch"], ["slow", "Slowest to launch"]] as const).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>

      <div className="cmp cmphdr" aria-hidden>
        <span>App</span>
        <span>Difficulty<em>How much stands between you and a working app</em></span>
        <span>The path, in order<em>What you do, then what the provider does</em></span>
      </div>

      {shown.map((r) => {
        const sv = severity(r);
        return (
          <Link key={r.slug} href={`/guide/${r.slug}`} className="cmp cmprow">
            <span className="c-app"><Logo slug={r.slug} app={r.app} /><b>{r.app}</b></span>
            <span className="c-diff" data-label="Difficulty">
              <span className="diffhead"><Meter tier={r.tier} /><strong>{r.label}</strong></span>
              <small>{TIER_BLURB[r.tier]}</small>
            </span>
            <span className="c-path" data-label="The path, in order">
              <span className="path">
                <span className="node n-you">
                  <i className="nlabel">1. You set it up</i>
                  <strong>{r.time}</strong>
                  <em>clicking and copying</em>
                </span>
                <span className="arrow" aria-hidden>→</span>
                <span className={`node n-wait ${sv.cls}`}>
                  <i className="nlabel">2. Provider approves</i>
                  <strong>{r.waitHeadline}</strong>
                  <em className="sevtag">{sv.word}</em>
                </span>
              </span>
              <small className="pnote">{r.waitNote}</small>
            </span>
          </Link>
        );
      })}

      <div className="howto">
        <b>How to read this</b>
        <ul>
          <li><b>The path</b> reads left to right in time order: first your hands-on setup time (our estimate), then the provider&apos;s approval wait. When both are done you can use the app.</li>
          <li><b>The middle box</b> shows what the provider states. Green means no wait, amber means days, red means weeks. A dashed grey box means we looked and no time is published, and we do not guess one.</li>
          <li><b>Fastest to launch</b> sorts by the wait first, then by your setup time. Providers with no published time go last, because we cannot say how long they take.</li>
        </ul>
      </div>
    </section>
  );
}
