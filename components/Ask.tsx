"use client";
import Link from "next/link";
import { useState } from "react";
import { Tag } from "./GuideView";

type Passage = { id: string; slug: string; app: string; section: string; text: string; tag: string | null };
type Result = { mode: "answer" | "passages" | "none"; answer: string | null; passages: Passage[]; message?: string; error?: string };

export function Ask({ slug, examples }: { slug?: string; examples: string[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function go(question: string) {
    setQ(question);
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, slug }) });
      setRes(await r.json());
    } catch {
      setRes({ mode: "none", answer: null, passages: [], error: "Could not reach the server. Check your connection and ask again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ask" aria-label="Ask the guides">
      <h2>{slug ? "Ask this guide" : "Ask all the guides"}</h2>
      <p className="muted">Answers come only from the guides below, with the passage each one rests on. If the guides do not cover it, it says so.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length > 2) go(q.trim());
        }}
        className="askform"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={examples[0]} maxLength={300} aria-label="Your question" />
        <button className="btn" disabled={busy || q.trim().length < 3}>{busy ? "Searching…" : "Ask"}</button>
      </form>
      <div className="examples">
        {examples.map((e) => (
          <button key={e} type="button" className="chip plain" onClick={() => go(e)}>{e}</button>
        ))}
      </div>

      {res?.error && <p className="err">{res.error}</p>}
      {res && !res.error && (
        <div className="answer" aria-live="polite">
          {res.answer && <p className="answer-text">{res.answer}</p>}
          {res.message && <p className="muted">{res.message}</p>}
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
