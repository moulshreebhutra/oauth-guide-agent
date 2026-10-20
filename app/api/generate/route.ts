import { generateGuide } from "@/lib/agent";
import { cleanAppInput, rateLimit } from "@/lib/safety";
import { mintShareToken } from "@/lib/share";

export const maxDuration = 300; // writing a whole guide with a model takes longer than 60s; the page shows progress meanwhile

// A finished guide is remembered for 6 hours, so a repeat request costs nothing and returns at once.
// (Memory of this server instance only; the browser keeps its own copy too.)
const TTL_MS = 6 * 3600_000;
const CACHE = new Map<string, { at: number; guide: any; notes: string[] }>();
const keyOf = (i: { name: string; site?: string }) => `${i.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}|${(i.site ?? "").toLowerCase()}`;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const body = await req.json().catch(() => ({}));
  const input = cleanAppInput(String(body.app ?? ""));
  if (!input) return new Response(JSON.stringify({ error: "Enter an app name or website." }), { status: 400 });

  const key = keyOf(input);
  const hit = CACHE.get(key);
  const fresh = hit && Date.now() - hit.at < TTL_MS && body.refresh !== true ? hit : undefined;
  // cached answers cost nothing, so they do not count against the hourly limit
  if (!fresh && !rateLimit(ip, 5)) return new Response(JSON.stringify({ error: "Rate limit: 5 live guides per hour per visitor. Browse the library or try later." }), { status: 429 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        if (fresh) {
          const mins = Math.max(1, Math.round((Date.now() - fresh.at) / 60_000));
          send({ type: "status", msg: `Reusing the guide written ${mins} minute(s) ago.` });
          send({ type: "guide", guide: fresh.guide, notes: fresh.notes, cached: true, cachedAt: fresh.at });
          const token = mintShareToken(fresh.guide);
          if (token) send({ type: "share", path: `/s/${token}` });
          ctl.close();
          return;
        }
        for await (const ev of generateGuide(input)) {
          send(ev);
          if (ev.type === "guide") {
            if (CACHE.size > 100) CACHE.delete(CACHE.keys().next().value!);
            CACHE.set(key, { at: Date.now(), guide: ev.guide, notes: ev.notes });
            const token = mintShareToken(ev.guide);
            if (token) send({ type: "share", path: `/s/${token}` });
          }
        }
      } catch (e: any) {
        send({ type: "error", msg: e?.message ?? "unexpected error" });
      }
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}
