"use client";
import { useEffect, useState } from "react";
import { GuideView } from "@/components/GuideView";
import { Md } from "@/components/Md";
import { PageHead } from "@/components/PageHead";
import type { Guide } from "@/lib/schema";
import { explainError, friendlyTool, type Step } from "@/lib/livelog";

const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u.slice(0, 40); } };
type Err = { headline: string; fix: string[]; raw: string };

export default function Live() {
  const [app, setApp] = useState("");
  useEffect(() => { try { const q = new URLSearchParams(location.search).get("app"); if (q) { setApp(q.slice(0, 120)); if (new URLSearchParams(location.search).get("go") === "1") setAuto(true); } } catch {} }, []);
  const [auto, setAuto] = useState(false);
  useEffect(() => { if (auto && app.trim().length >= 2) { setAuto(false); void run(null); } }); // eslint-disable-line react-hooks/exhaustive-deps
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

  const [cachedAt, setCachedAt] = useState<number | null>(null);

  async function run(e: React.FormEvent | null, refresh = false) {
    e?.preventDefault();
    setBusy(true);
    setSteps([]);
    setNow("Starting…");
    setErr(null);
    setGuide(null);
    setShare(null);
    setCopied(false);
    const ck = "guide:" + app.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    // browser copy: the same app asked again within 6 hours shows at once, with no server call
    if (!refresh) {
      try {
        const c = JSON.parse(localStorage.getItem(ck) ?? "null");
        if (c && Date.now() - c.at < 6 * 3600_000 && c.g) {
          setGuide({ g: c.g, notes: c.notes ?? [] }); setShare(c.share ?? null); setCachedAt(c.at); setBusy(false); return;
        }
      } catch { /* storage unavailable: carry on without it */ }
    }
    setCachedAt(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app, refresh }) });
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
          if (ev.type === "guide") {
            got = true; setGuide({ g: ev.guide, notes: ev.notes }); if (ev.cached) setCachedAt(ev.cachedAt ?? Date.now());
            try { localStorage.setItem(ck, JSON.stringify({ at: ev.cachedAt ?? Date.now(), g: ev.guide, notes: ev.notes })); } catch { /* ignore */ }
          }
          else if (ev.type === "share") {
            setShare(ev.path);
            try { const c = JSON.parse(localStorage.getItem(ck) ?? "null"); if (c) localStorage.setItem(ck, JSON.stringify({ ...c, share: ev.path })); } catch { /* ignore */ }
          }
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
        compact={!!guide}
        eyebrow="Live agent"
        title={<>Research any app, <mark className="hl">get a shareable guide</mark></>}
        lede="Type an app name or website. The agent searches, reads the provider's pages, and writes a guide. Quotes are checked by code against the pages it actually read; anything it cannot back up is downgraded."
      >
        <form onSubmit={run} className="liveform">
          <input value={app} onChange={(e) => setApp(e.target.value)} placeholder="e.g. Linear, or zoom.us" maxLength={120} aria-label="App name or website" />
          <button className="btn" disabled={busy || app.trim().length < 2}>{busy ? "Working…" : "Generate guide"}</button>
        </form>
        {guide && cachedAt && !busy && (
          <p className="cachenote">
            Saved copy from {Math.max(1, Math.round((Date.now() - cachedAt) / 60_000))} minute(s) ago, kept for 6 hours.{" "}
            <button type="button" className="linkbtn" onClick={() => run(null, true)}>Write a fresh one</button>
          </p>
        )}
        {(busy || steps.length > 0 || err) && (
          <div className="agentlog" aria-live="polite">
            {busy && (
              <div className="runcard">
                <span className="spin" aria-hidden />
                <div className="runtext">
                  <b>{now || "Starting…"}</b>
                  <span>{steps.length} step{steps.length === 1 ? "" : "s"} done · {secs}s</span>
                </div>
                <i className="runbar" aria-hidden />
              </div>
            )}
            {steps.length > 0 && (
              <details className="agrun">
                <summary>
                  <span>{busy ? "What the agent has done so far" : "How this guide was researched"}</span>
                  <em>{steps.length} step{steps.length === 1 ? "" : "s"}{steps.some((x) => x.state === "warn") ? ` · ${steps.filter((x) => x.state === "warn").length} with a problem` : ""}</em>
                </summary>
                <ol className="agsteps">
                  {steps.map((st) => {
                    const sub0 = st.data?.items ? `${st.data.items.length} results` : st.data?.url ? hostOf(st.data.url) : "";
                    const sub = sub0 && !st.title.includes(sub0) ? sub0 : "";
                    const body = st.detail || st.data;
                    const row = (
                      <>
                        <span className="dot" aria-hidden>{st.state === "warn" ? "!" : "✓"}</span>
                        <span className="stxt"><b>{st.title}</b>{sub && <small>{sub}</small>}</span>
                      </>
                    );
                    return (
                      <li key={st.id} className={`st-${st.state}`}>
                        {body ? (
                          <details className="stone">
                            <summary>{row}</summary>
                            <div className="stbody">
                              {st.detail && <p className="dtext"><Md t={st.detail} /></p>}
                              {st.data?.facts && st.data.facts.length > 0 && (
                                <div><h4>What it found</h4><ul className="facts-list">{st.data.facts.map((f, i) => <li key={i}><Md t={f} /></li>)}</ul></div>
                              )}
                              {!st.data?.facts?.length && st.data?.excerpt && <p className="dtext"><Md t={st.data.excerpt} />{st.data.excerpt.length >= 400 ? "…" : ""}</p>}
                              {st.data?.items && (
                                <ul className="dlinks">{st.data.items.map((it) => <li key={it.url}><a href={it.url} target="_blank" rel="noreferrer">{it.title.slice(0, 90)}</a><span>{hostOf(it.url)}</span></li>)}</ul>
                              )}
                              {st.data?.url && <a className="dopen" href={st.data.url} target="_blank" rel="noreferrer">{st.data.title ? `Open: ${st.data.title.slice(0, 60)}` : "Open the page"}</a>}
                            </div>
                          </details>
                        ) : <div className="stone plain">{row}</div>}
                      </li>
                    );
                  })}
                </ol>
              </details>
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
      {guide && <GuideView g={guide.g} notes={guide.notes} embedded />}
      {guide && (
        <p className="wrap sharebar">
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
