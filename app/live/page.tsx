"use client";
import { useEffect, useState } from "react";
import { GuideView } from "@/components/GuideView";
import { PageHead } from "@/components/PageHead";
import type { Guide } from "@/lib/schema";

type Line = { kind: "status" | "tool" | "warn" | "error"; text: string };

export default function Live() {
  const [app, setApp] = useState("");
  useEffect(() => { try { const q = new URLSearchParams(location.search).get("app"); if (q) setApp(q.slice(0, 120)); } catch {} }, []);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [guide, setGuide] = useState<{ g: Guide; notes: string[] } | null>(null);
  const [share, setShare] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLines([]);
    setGuide(null);
    setShare(null);
    setCopied(false);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ app }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Request failed" }));
        setLines([{ kind: "error", text: j.error }]);
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
          else if (ev.type === "error") { got = true; setLines((l) => [...l, { kind: "error", text: ev.msg }]); }
          else if (ev.type === "tool") setLines((l) => [...l, { kind: "tool", text: `${ev.name}(${ev.arg}) → ${ev.result}` }]);
          else setLines((l) => [...l, { kind: ev.type, text: ev.msg }]);
        }
      }
      if (!got) setLines((l) => [...l, { kind: "error", text: "The connection closed before a guide arrived. The server time limit may have been reached. Try again, or add the provider's developer-docs URL." }]);
    } catch (err: any) {
      setLines((l) => [...l, { kind: "error", text: err.message }]);
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
        {lines.length > 0 && (
          <ul className="log" aria-live="polite">
            {lines.map((l, i) => (
              <li key={i} className={`log-${l.kind}`}>{l.text}</li>
            ))}
          </ul>
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
