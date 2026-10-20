// Shared server-side cache. Uses Vercel Blob (free tier) when BLOB_READ_WRITE_TOKEN is set,
// so a guide written once is reused by every visitor and every server instance.
// Without the token it quietly falls back to this instance's memory.
import { put, head, del } from "@vercel/blob";

const MEM = new Map<string, { at: number; value: any }>();
const enabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const path = (key: string) => `cache/${key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "x"}.json`;

export const storeKind = () => (enabled() ? "vercel-blob" : "memory");

export async function cacheGet<T>(key: string, ttlMs: number): Promise<{ at: number; value: T } | undefined> {
  const m = MEM.get(key);
  if (m && Date.now() - m.at < ttlMs) return m;
  if (!enabled()) return undefined;
  try {
    const meta = await head(path(key));
    const r = await fetch(meta.url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return undefined;
    const j: any = await r.json();
    if (typeof j?.at !== "number" || Date.now() - j.at >= ttlMs) return undefined;
    MEM.set(key, { at: j.at, value: j.value });
    return { at: j.at, value: j.value };
  } catch {
    return undefined; // missing or unreachable: treat as a miss
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const at = Date.now();
  if (MEM.size > 100) MEM.delete(MEM.keys().next().value!);
  MEM.set(key, { at, value });
  if (!enabled()) return;
  try {
    await put(path(key), JSON.stringify({ at, value }), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
  } catch { /* cache is best effort */ }
}

export async function cacheDelete(key: string): Promise<void> {
  MEM.delete(key);
  if (!enabled()) return;
  try { await del((await head(path(key))).url); } catch { /* already gone */ }
}

/** For /api/health: is the token present, and does a tiny write and read actually work? Never returns the token. */
export async function storeSelfTest(): Promise<{ kind: string; tokenPresent: boolean; ok?: boolean; error?: string }> {
  const tokenPresent = enabled();
  if (!tokenPresent) return { kind: "memory", tokenPresent };
  try {
    await put("cache/_health.json", JSON.stringify({ at: Date.now() }), { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
    const meta = await head("cache/_health.json");
    const r = await fetch(meta.url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return { kind: "vercel-blob", tokenPresent, ok: r.ok };
  } catch (e: any) {
    return { kind: "vercel-blob", tokenPresent, ok: false, error: String(e?.message ?? e).replace(/vercel_blob_[A-Za-z0-9_]+/g, "[token]").slice(0, 200) };
  }
}
