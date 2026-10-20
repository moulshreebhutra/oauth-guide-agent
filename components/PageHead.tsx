import type { ReactNode } from "react";

/** Dark page header band, the same pattern composio.dev uses at the top of every page. */
export function PageHead({ eyebrow, title, lede, children, center }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={`band pagehead${center ? " center" : ""}`}>
      <div className="wrap">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </div>
  );
}
