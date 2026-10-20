"use client";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Draws a Mermaid flowchart in the browser (the library is loaded only on pages that use it).
 * If drawing fails, the source is shown as text, so the page never ends up blank.
 */
export function Mermaid({ code, label }: { code: string; label: string }) {
  const id = "mm" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "Geist Variable, Geist, ui-sans-serif, system-ui, sans-serif",
          flowchart: { curve: "basis", htmlLabels: true, padding: 12, nodeSpacing: 36, rankSpacing: 44, useMaxWidth: true },
          themeVariables: {
            primaryColor: "#ffffff", primaryTextColor: "#0f0f0f", primaryBorderColor: "#0f0f0f",
            lineColor: "#3a3a3a", secondaryColor: "#eef0ff", tertiaryColor: "#f6f6f6",
            clusterBkg: "#fafafa", clusterBorder: "#bdbdbd", edgeLabelBackground: "#f6f6f6", fontSize: "14px",
          },
        });
        const { svg } = await mermaid.render(id, code);
        if (dead || !box.current) return;
        box.current.innerHTML = svg;
        setState("ok");
      } catch {
        if (!dead) setState("failed");
      }
    })();
    return () => { dead = true; };
  }, [code, id]);

  return (
    <figure className="mm" aria-label={label}>
      <div ref={box} className="mm-svg" role="img" aria-label={label} hidden={state !== "ok"} />
      {state === "loading" && <p className="muted small mm-note">Drawing the diagram…</p>}
      {state === "failed" && <p className="muted small mm-note">The diagram could not be drawn in this browser. Its source is below.</p>}
      <details open={state === "failed"} className="mm-src"><summary>Diagram source</summary><pre>{code}</pre></details>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
