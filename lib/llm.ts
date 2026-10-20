import { GoogleGenAI } from "@google/genai";

/** One place that calls Gemini: tries the configured model, then free-tier fallbacks, and reports WHY it failed. */
const FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"];

export const safeError = (e: unknown) =>
  String((e as any)?.message ?? e)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 220);

export async function generate(prompt: string, opts: { json?: boolean; timeoutMs?: number; temperature?: number } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const models = [...new Set([process.env.GEMINI_MODEL, ...FALLBACKS].filter(Boolean) as string[])];
  const client = new GoogleGenAI({ apiKey: key });
  const failures: string[] = [];
  for (const model of models) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: opts.temperature ?? 0.2,
          abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      });
      if (res.text) return res.text;
      failures.push(`${model}: empty answer`);
    } catch (e) {
      const msg = safeError(e);
      failures.push(`${model}: ${msg}`);
      // a bad key or exhausted project will fail every model; do not burn the time budget retrying
      if (/API key|API_KEY|permission|PERMISSION_DENIED|UNAUTHENTICATED|401|403/i.test(msg)) break;
      if (/abort|timeout/i.test(msg)) break;
    }
  }
  throw new Error(failures.join(" | ").slice(0, 400));
}
