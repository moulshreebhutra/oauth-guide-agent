"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Tag } from "./GuideView";

type Passage = { id: string; slug: string; app: string; section: string; text: string; tag: string | null };
type Result = { mode: "answer" | "passages" | "none"; answer: string | null; passages: Passage[]; message?: string; detail?: string; error?: string; extractive?: boolean };

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
    if (first.error || first.mode === "none") { setPhase("done"); return; }
    // 2) the written answer upgrades it when the model replies
    setPhase("writing");
    try {
      const better = await post({ question, slug }, 34000);
      if (id !== run.current) return;
      if (better.error) throw new Error(better.error);
      setRes(better);
    } catch (e: any) {
      if (id !== run.current) return;
      setRes((r) => (r ? { ...r, extractive: true, message: "The AI model did not answer in time, so this is the guides' own wording. Use Try again for a written answer.", detail: e?.name === "TimeoutError" ? "No reply within 34 seconds" : String(e?.message ?? e).slice(0, 200) } : r));
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
          <p className="muted small">{phase === "quick" ? "Searching the guides…" : `Quoted answer shown below. The written answer usually takes 5 to 20 seconds. ${secs}s so far.`}</p>
        </div>
      )}

      {res?.error && <p className="err">{res.error}</p>}
      {res && !res.error && (
        <div className="answer" aria-live="polite">
          {res.answer && <p className="answer-text">{res.answer}</p>}
          {res.message && <p className="muted">{res.message}</p>}
          {!busy && res.extractive && last.current && <p><button type="button" className="btn ghost" onClick={() => go(last.current)}>Try again for a written answer</button></p>}
          {res.detail && !busy && <details><summary className="small">Technical detail</summary><p className="muted small">{res.detail}</p></details>}
          {res.passages.length > 0 && (
            <>
              <h3>{res.mode === "answer" ? "Passages cited" : "Most relevant passages"}</h3>
              <ul className="passages">
                {res.passages.map((p) => (
                  <li key={p.id}>
                    <span className="pid">[{p.id}]</span>{" "}
                    <Link href={`/guide/${p.slug}`}>{p.app} - {p.section}</Link> {p.tag && <Tag t={p.tag} />}
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
