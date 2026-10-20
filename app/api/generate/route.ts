import { generateGuide } from "@/lib/agent";
import { cleanAppInput, rateLimit } from "@/lib/safety";
import { mintShareToken } from "@/lib/share";

export const maxDuration = 300; // writing a whole guide with a model takes longer than 60s; the page shows progress meanwhile

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(ip, 5)) return new Response(JSON.stringify({ error: "Rate limit: 5 live guides per hour per visitor. Browse the library or try later." }), { status: 429 });
  const body = await req.json().catch(() => ({}));
  const input = cleanAppInput(String(body.app ?? ""));
  if (!input) return new Response(JSON.stringify({ error: "Enter an app name or website." }), { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        for await (const ev of generateGuide(input)) {
          send(ev);
          if (ev.type === "guide") {
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
