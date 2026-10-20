import { GoogleGenAI } from "@google/genai";

/** One place that calls Gemini: tries the configured model, then free-tier fallbacks, and reports WHY it failed. */
const FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"];

export const safeError = (e: unknown) =>
  String((e as any)?.message ?? e)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 220);

export async function generate(
  prompt: string,
  opts: { json?: boolean; timeoutMs?: number; temperature?: number; models?: string[]; deadlineMs?: number } = {},
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const models = [...new Set([...(opts.models ?? []), process.env.GEMINI_MODEL, ...FALLBACKS].filter(Boolean) as string[])];
  const client = new GoogleGenAI({ apiKey: key });
  const started = Date.now();
  const failures: string[] = [];
  for (const model of models) {
    const left = (opts.deadlineMs ?? Infinity) - (Date.now() - started);
    if (left < 2500) break;
    try {
      const res = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: opts.temperature ?? 0.2,
          abortSignal: AbortSignal.timeout(Math.min(opts.timeoutMs ?? 15_000, left)),
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      });
      if (res.text) return res.text;
      failures.push(`${model}: empty answer`);
    } catch (e) {
      const msg = safeError(e);
      failures.push(`${model}: ${msg}`);
      // a bad key fails every model, so stop. Overload (503), quota (429), timeouts and unknown models move on to the next model.
      if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) break;
    }
  }
  throw new Error(failures.join(" | ").slice(0, 400));
}
