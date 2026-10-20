import { LOGOS } from "@/lib/logos";

/** Real logo where we have one; otherwise a neutral letter tile (we never draw brand marks ourselves). */
export function Logo({ slug, app, size = 36 }: { slug: string; app: string; size?: number }) {
  const l = LOGOS[slug];
  const dim = { width: size, height: size };
  if (l?.color)
    return (
      <span className="logo" style={dim} role="img" aria-label={`${app} logo`}>
        <svg viewBox={`0 0 ${l.color.w} ${l.color.h}`} width={size * 0.6} height={size * 0.6} aria-hidden dangerouslySetInnerHTML={{ __html: l.color.body }} />
      </span>
    );
  if (l)
    return (
      <span className="logo" style={dim} role="img" aria-label={`${app} logo`}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} aria-hidden><path d={l.path} fill={l.hex} /></svg>
      </span>
    );
  return (
    <span className="logo mono" style={{ ...dim, fontSize: size * 0.45 }} role="img" aria-label={`${app} (no logo)`}>
      {app.trim().charAt(0).toUpperCase()}
    </span>
  );
}
