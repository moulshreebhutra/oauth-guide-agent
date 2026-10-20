"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Tag } from "./GuideView";

type Passage = { id: string; slug: string; app: string; section: string; text: string; tag: string | null };
type Result = { composed?: boolean; general?: boolean; mode: "answer" | "passages" | "none"; answer: string | null; passages: Passage[]; message?: string; detail?: string; error?: string; extractive?: boolean };

/** Render the answer: **bold**, bullet lines, and [slug#n] citations as links to the guide. No HTML is ever injected. */
function Answer({ text }: { text: string }) {
  const parts = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|\[[^\]]*#\d+[^\]]*\])/g).map((t, i) => {
      if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i}>{t.slice(2, -2)}</strong>;
      if (/^\[[^\]]*#\d+[^\]]*\]$/.test(t))
        return (
          <span key={i} className="cite">
            {t.slice(1, -1).split(/[,;\s]+/).filter(Boolean).map((id) => {
              const slug = id.split("#")[0];
              return <Link key={id} href={`/guide/${slug}`} title={`Open the ${slug} guide`}>{id}</Link>;
            })}
          </span>
        );
      return t.replace(/\*\*/g, "");
    });
  return (
    <div className="answer-text">
      {text.split(/\n+/).filter(Boolean).map((l, i) => {
        const m = l.match(/^\s*[-*•]\s+(.*)$/);
        return m ? <p key={i} className="bul">{parts(m[1])}</p> : <p key={i}>{parts(l)}</p>;
      })}
    </div>
  );
}

const STEPS = ["Finding the passages", "Asking the AI model", "Checking its citations"];

async function post(body: object, ms: number): Promise<Result> {
  const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
  return r.json();
}

export function Ask({ slug, examples }: { slug?: string; examples: string[] }) {
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "quick" | "writing" | "done">("idle");
  const [secs, setSecs] = useState(0);
  const [res, setRes] = useState<Result | null>(null);
  const run = useRef(0);
  const last = useRef("");
  const busy = phase === "quick" || phase === "writing";

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function go(question: string) {
    const id = ++run.current;
    last.current = question;
    setQ(question);
    setRes(null);
    setSecs(0);
    setPhase("quick");
    // 1) instant answer from the guides' own words (no model, no network call)
    let first: Result | null = null;
    try {
      first = await post({ question, slug, phase: "quick" }, 8000);
      if (id !== run.current) return;
      setRes(first);
    } catch {
      if (id !== run.current) return;
      setRes({ mode: "none", answer: null, passages: [], error: "Could not reach the server. Check your connection and try again." });
      setPhase("done");
      return;
    }
    if (first.error || (first.mode === "none" && !first.general)) { setPhase("done"); return; }
    // 2) the written answer upgrades it when the model replies
    setPhase("writing");
    try {
      const better = await post({ question, slug }, 52000);
      if (id !== run.current) return;
      if (better.error) throw new Error(better.error);
      setRes(better);
    } catch (e: any) {
      if (id !== run.current) return;
      setRes((r) => (r && !r.general ? { ...r, extractive: true, message: "The AI model did not answer in time, so this is the guides' own wording. Use Try again for a written answer.", detail: e?.name === "TimeoutError" ? "No reply within 52 seconds" : String(e?.message ?? e).slice(0, 200) } : r));
    } finally {
      if (id === run.current) setPhase("done");
    }
  }

  const step = phase === "quick" ? 0 : phase === "writing" ? (secs < 12 ? 1 : 2) : 3;

  return (
    <section className="ask" aria-label="Ask the guides">
      <h2>{slug ? "Ask this guide" : "Ask all the guides"}</h2>
      <p className="muted">Answers come only from the guides, with the passage each one rests on. If the guides do not cover it, it says so.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length > 2 && !busy) go(q.trim()); }} className="askform">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={examples[0]} maxLength={300} aria-label="Your question" />
        <button className="btn" disabled={busy || q.trim().length < 3}>{busy ? "Working…" : "Ask"}</button>
      </form>
      <div className="examples">
        {examples.map((e) => (
          <button key={e} type="button" className="chip plain" disabled={busy} onClick={() => go(e)}>{e}</button>
        ))}
      </div>

      {busy && (
        <div className="loader" role="status" aria-live="polite">
          <ol>
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
                <span className="dot" aria-hidden />{s}
              </li>
            ))}
          </ol>
          <div className="bar" aria-hidden><i /></div>
          <p className="muted small">{phase === "quick" ? "Searching the guides…" : `The AI is writing your answer from the guides. This usually takes 5 to 25 seconds. ${secs}s so far.`}</p>
        </div>
      )}

      {res?.error && <p className="err">{res.error}</p>}
      {res && !res.error && !(busy && res.extractive && !res.general) && (
        <div className="answer" aria-live="polite">
          <p className={`badge ${res.general ? "b-gen" : res.extractive || res.mode === "passages" ? "b-quote" : "b-ai"}`}>
            {res.general ? "AI general knowledge · not from our guides" : res.extractive || res.mode === "passages" ? "Summarised by code from the guides · no AI used" : "AI answer · written from the guides below"}
          </p>
          {res.answer && !res.extractive && res.mode === "answer" && <Answer text={res.answer} />}
          {res.answer && res.extractive && <Answer text={res.answer} />}
          {res.message && !(busy && res.extractive) && <p className="muted small">{res.message}</p>}
                    {!busy && res.extractive && last.current && <p><button type="button" className="btn ghost" onClick={() => go(last.current)}>Try again for an AI answer</button></p>}
          {res.detail && !busy && <details><summary className="small">Why there is no AI answer</summary><p className="muted small">{res.detail}</p></details>}
          {res.passages.length > 0 && (
            <>
              <h3>{res.extractive ? "Passages behind this summary" : "Passages the answer rests on"}</h3>
              <ul className="passages">
                {res.passages.map((p) => (
                  <li key={p.id}>
                    <div className="ptop"><Link href={`/guide/${p.slug}`}>{p.app} · {p.section}</Link> {p.tag && <Tag t={p.tag} />} <span className="pid">{p.id}</span></div>
                    <p>{p.text.replace(/^[^.]*\.\s/, "")}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
