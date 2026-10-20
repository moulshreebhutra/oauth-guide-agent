import { GoogleGenAI } from "@google/genai";
import { storeSelfTest } from "@/lib/store";
import { rateLimit } from "@/lib/safety";
import { safeError, callGroq, callOpenRouter } from "@/lib/llm";
import { embeddingsPrebuilt } from "@/lib/embed";

export const maxDuration = 30;

/** Diagnostics: does each configured AI provider answer right now, and which Gemini models does the key see? Never returns the key. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit("health:" + ip, 6)) return Response.json({ error: "Too many checks. Try again later." }, { status: 429 });
  let claude: unknown = { configured: false };
  if (process.env.ANTHROPIC_API_KEY) {
    const t0 = Date.now();
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 5, messages: [{ role: "user", content: "Say ok" }] }), signal: AbortSignal.timeout(15_000) });
      claude = { configured: true, ok: r.ok, status: r.status, ms: Date.now() - t0, ...(r.ok ? {} : { error: safeError(await r.text()).slice(0, 160) }) };
    } catch (e) { claude = { configured: true, ok: false, error: safeError(e) }; }
  }
  const none = { configured: false };
  const shared = async (f: () => Promise<string>) => { const t0 = Date.now(); try { await f(); return { configured: true, ok: true, ms: Date.now() - t0 }; } catch (e) { return { configured: true, ok: false, ms: Date.now() - t0, error: safeError(e).slice(0, 200) }; } };
  const openrouter = process.env.OPENROUTER_API_KEY ? await shared(() => callOpenRouter("Say ok", 15_000, 0)) : none;
  const providers = { claude, openrouter };
  const cache = await storeSelfTest();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ providers, claude, cache, keyConfigured: false });
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
  const groq: unknown = process.env.GROQ_API_KEY ? await shared(() => callGroq("Say ok", 15_000, 0)) : { configured: false };
  return Response.json({ providers, claude, cache, embeddingsPrebuilt: embeddingsPrebuilt(), keyConfigured: true, groq, modelsVisibleToKey: listed, listError, tests });
}
