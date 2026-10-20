"use client";
import { useState } from "react";

/** Copy / print actions. The text is built on the server and passed in, so the client only copies it. */
export function GuideActions({ markdown, brief, slug }: { markdown: string; brief: string; slug: string }) {
  const [done, setDone] = useState<string>("");
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setDone(what); setTimeout(() => setDone(""), 2200); } catch { setDone("Copy blocked by the browser"); }
  };
  const badge = `[![OAuth setup](https://oauth-guide-agent.vercel.app/badge/${slug})](https://oauth-guide-agent.vercel.app/guide/${slug})`;
  return (
    <div className="actions" role="group" aria-label="Use this guide">
      <button type="button" className="btn ghost" onClick={() => copy("Markdown copied", markdown)}>Copy as Markdown</button>
      <button type="button" className="btn ghost" onClick={() => copy("Agent brief copied", brief)} title="A task for your coding agent that stops where a person must act">Copy agent brief</button>
      <button type="button" className="btn ghost" onClick={() => window.print()}>Print or save PDF</button>
      <button type="button" className="btn ghost" onClick={() => copy("Badge markdown copied", badge)}>Copy README badge</button>
      <span className="muted small" aria-live="polite">{done}</span>
    </div>
  );
}
