import { GoogleGenAI } from "@google/genai";
import { rateLimit } from "@/lib/safety";
import { safeError } from "@/lib/llm";

export const maxDuration = 30;

/** Diagnostics: which Gemini models does this key see, and does each one answer right now? Never returns the key. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit("health:" + ip, 6)) return Response.json({ error: "Too many checks. Try again later." }, { status: 429 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ keyConfigured: false });
  const client = new GoogleGenAI({ apiKey: key });
  let listed: string[] = [];
  let listError: string | undefined;
  try {
    const pager = await client.models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const n = (m.name ?? "").replace(/^models\//, "");
      if (/gemini/i.test(n) && !/embedding|tts|image|live|audio|vision/i.test(n) && (m.supportedActions ?? ["generateContent"]).includes("generateContent")) listed.push(n);
      if (listed.length > 60) break;
    }
  } catch (e) {
    listError = safeError(e);
  }
  const candidates = [...new Set([process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"].filter(Boolean) as string[])];
  const tests = await Promise.all(
    candidates.map(async (model) => {
      const t0 = Date.now();
      try {
        const r = await client.models.generateContent({ model, contents: "Reply with the single word: ok", config: { abortSignal: AbortSignal.timeout(15_000) } });
        return { model, ok: !!r.text, ms: Date.now() - t0 };
      } catch (e) {
        return { model, ok: false, ms: Date.now() - t0, error: safeError(e).slice(0, 160) };
      }
    }),
  );
  return Response.json({ keyConfigured: true, modelsVisibleToKey: listed, listError, tests });
}
