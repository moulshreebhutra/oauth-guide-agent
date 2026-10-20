import { GoogleGenAI } from "@google/genai";

/** One place that calls Gemini: tries the configured model, then free-tier fallbacks, and reports WHY it failed. */
const FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

export const safeError = (e: unknown) =>
  String((e as any)?.message ?? e)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 220);

export async function generate(
  prompt: string,
  opts: { json?: boolean; timeoutMs?: number; temperature?: number; models?: string[]; deadlineMs?: number; race?: boolean } = {},
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const models = [...new Set([...(opts.models ?? []), process.env.GEMINI_MODEL, ...FALLBACKS].filter(Boolean) as string[])];
  const client = new GoogleGenAI({ apiKey: key });
  const started = Date.now();
  const failures: string[] = [];
  const call = async (model: string, ms: number) => {
    const res = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: opts.temperature ?? 0.2,
        abortSignal: AbortSignal.timeout(ms),
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    if (!res.text) throw new Error("empty answer");
    return res.text;
  };
  if (opts.race) {
    // ask every model at once and use the first good answer: one overloaded model cannot hold the others up
    const ms = Math.min(opts.timeoutMs ?? 15_000, opts.deadlineMs ?? Infinity);
    try {
      const t0 = Date.now();
      const attempt = async (m: string) => {
        try {
          return await call(m, ms);
        } catch (e) {
          // overloaded or slow: one quick retry on the same model while time remains
          const left = ms - (Date.now() - t0);
          if (left > 6000 && /503|UNAVAILABLE|overloaded|demand|aborted|timeout/i.test(safeError(e))) {
            await new Promise((r) => setTimeout(r, 1200));
            return await call(m, left - 1500);
          }
          throw e;
        }
      };
      return await Promise.any(models.map((m) => attempt(m).catch((e) => { throw new Error(`${m}: ${safeError(e)}`); })));
    } catch (e) {
      const errs = (e as AggregateError).errors?.map((x: any) => String(x?.message ?? x)) ?? [safeError(e)];
      throw new Error(errs.join(" | ").slice(0, 400));
    }
  }
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
