"use client";
import { useEffect, useState } from "react";
import { GuideView } from "@/components/GuideView";
import { PageHead } from "@/components/PageHead";
import type { Guide } from "@/lib/schema";
import { explainError, friendlyTool, type Step } from "@/lib/livelog";

type Err = { headline: string; fix: string[]; raw: string };

export default function Live() {
  const [app, setApp] = useState("");
  useEffect(() => { try { const q = new URLSearchParams(location.search).get("app"); if (q) setApp(q.slice(0, 120)); } catch {} }, []);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [now, setNow] = useState("");
  const [err, setErr] = useState<Err | null>(null);
  const [secs, setSecs] = useState(0);
  useEffect(() => { if (!busy) return; setSecs(0); const t = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(t); }, [busy]);
  const add = (st: Omit<Step, "id">) => setSteps((l) => [...l, { id: l.length, ...st }]);
  const [guide, setGuide] = useState<{ g: Guide; notes: string[] } | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSteps([]);
    setNow("Starting…");
    setErr(null);
    setGuide(null);
    setShare(null);
    setCopied(false);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Request failed" }));
        setErr(explainError(String(j.error ?? "Request failed")));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let got = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const ev = JSON.parse(p.slice(6));
          if (ev.type === "guide") { got = true; setGuide({ g: ev.guide, notes: ev.notes }); }
          else if (ev.type === "share") setShare(ev.path);
          else if (ev.type === "error") { got = true; setErr(explainError(String(ev.msg))); }
          else if (ev.type === "tool") add(friendlyTool(ev.name, String(ev.arg), String(ev.result), ev.data));
          else if (ev.type === "warn") add({ state: "warn", title: /did not answer|unreadable/i.test(ev.msg) ? "An AI model did not answer; trying another" : String(ev.msg).slice(0, 140), detail: String(ev.msg) });
          else setNow(String(ev.msg));
        }
      }
      if (!got) setErr({ headline: "The connection closed before a guide arrived.", fix: ["The server time limit may have been reached. Try again, or paste the provider's developer-docs address."], raw: "stream ended without a guide" });
    } catch (err2: any) {
      setErr(explainError(String(err2.message)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHead
        center
        eyebrow="Live agent"
        title={<>Research any app, <mark className="hl">get a shareable guide</mark></>}
        lede="Type an app name or website. The agent searches, reads the provider's pages, and writes a guide. Quotes are checked by code against the pages it actually read; anything it cannot back up is downgraded."
      >
        <form onSubmit={run} className="liveform">
          <input value={app} onChange={(e) => setApp(e.target.value)} placeholder="e.g. Linear, or zoom.us" maxLength={120} aria-label="App name or website" />
          <button className="btn" disabled={busy || app.trim().length < 2}>{busy ? "Working…" : "Generate guide"}</button>
        </form>
        {(busy || steps.length > 0 || err) && (
          <div className="agentlog" aria-live="polite">
            {busy && <p className="now"><span className="spin" aria-hidden /> {now} <span className="muted">{secs}s</span></p>}
            {steps.length > 0 && (
              <ol className="agsteps">
                {steps.map((st) => (
                  <li key={st.id} className={`st-${st.state}`}>
                    <span className="dot" aria-hidden>{st.state === "warn" ? "!" : "✓"}</span>
                    <div><b>{st.title}</b>{(st.detail || st.data) && (
                      <details><summary>{st.data?.items ? `see the ${st.data.items.length} results` : st.data?.excerpt ? "see what it read" : "detail"}</summary>
                        {st.detail && <p className="dtext">{st.detail}</p>}
                        {st.data?.items && <ul className="dlinks">{st.data.items.map((it) => <li key={it.url}><a href={it.url} target="_blank" rel="noreferrer">{it.title.slice(0, 90)}</a><span>{new URL(it.url).hostname}</span></li>)}</ul>}
                        {st.data?.excerpt && <p className="dtext excerpt">{st.data.excerpt}{st.data.excerpt.length >= 700 ? "…" : ""}</p>}
                        {st.data?.url && <a className="dopen" href={st.data.url} target="_blank" rel="noreferrer">Open the page</a>}
                      </details>
                    )}</div>
                  </li>
                ))}
              </ol>
            )}
            {err && (
              <div className="agenterr" role="alert">
                <h3>{err.headline}</h3>
                <ul>{err.fix.map((f) => <li key={f}>{f}</li>)}</ul>
                <details><summary>Technical detail</summary><code>{err.raw}</code></details>
              </div>
            )}
          </div>
        )}
      </PageHead>
      {guide && <GuideView g={guide.g} notes={guide.notes} />}
      {guide && (
        <p className="wrap" style={{ paddingTop: 24 }}>
          {share && (
            <button className="btn" onClick={() => { navigator.clipboard.writeText(location.origin + share); setCopied(true); }}>
              {copied ? "Link copied" : "Copy share link"}
            </button>
          )}{" "}
          <button className="btn ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(guide.g, null, 2))}>Copy guide JSON</button>
          {!share && <span className="muted"> Share links are off: set SHARE_SECRET on the server.</span>}
        </p>
      )}
    </main>
  );
}
