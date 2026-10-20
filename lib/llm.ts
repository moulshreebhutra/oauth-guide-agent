import { GoogleGenAI } from "@google/genai";

/** One place that calls Gemini: tries the configured model, then free-tier fallbacks, and reports WHY it failed. */
const FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

export const safeError = (e: unknown) =>
  String((e as any)?.message ?? e)
    .replace(/^This operation was aborted$/i, "no reply before the time limit")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 220);

async function callGroq(prompt: string, ms: number, temperature: number): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile", temperature, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const j: any = await res.json();
  const t = j?.choices?.[0]?.message?.content;
  if (!t) throw new Error("empty answer");
  return String(t);
}

export async function generate(
  prompt: string,
  opts: { json?: boolean; timeoutMs?: number; temperature?: number; models?: string[]; deadlineMs?: number; race?: boolean; fast?: boolean } = {},
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  const models = [...new Set([...(opts.models ?? []), process.env.GEMINI_MODEL, ...FALLBACKS].filter(Boolean) as string[])];
  const client = new GoogleGenAI({ apiKey: key });
  const started = Date.now();
  const failures: string[] = [];
  const call = async (model: string, ms: number) => {
    const run = (thinkingOff: boolean) =>
      client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: opts.temperature ?? 0.2,
          abortSignal: AbortSignal.timeout(ms),
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
          ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      });
    let res;
    try {
      // short answers do not need "thinking" time; turning it off is much faster
      res = opts.fast ? await run(true) : await run(false);
    } catch (e) {
      if (opts.fast && /thinking|budget|INVALID_ARGUMENT|400/i.test(safeError(e)) && !/abort/i.test(safeError(e))) res = await run(false);
      else throw e;
    }
    if (!res.text) throw new Error("empty answer");
    return res.text;
  };
  if (opts.race) {
    // ask every model at once and use the first good answer: one overloaded model cannot hold the others up
    const ms = Math.min(opts.timeoutMs ?? 15_000, opts.deadlineMs ?? Infinity);
    try {
      const t0 = Date.now();
      const transient = /429|408|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE|overloaded|demand|time limit|fetch failed|ECONN|ETIMEDOUT/i;
      // Google's guidance: retry transient errors (429, 5xx) with exponential backoff plus jitter, never retry 400/403/404.
      const withBackoff = async (fn: (ms: number) => Promise<string>) => {
        let delay = 1000;
        for (let n = 0; ; n++) {
          const left = ms - (Date.now() - t0);
          try {
            return await fn(Math.min(Math.max(3000, left), 16_000)); // short attempts leave room for backoff retries
          } catch (e) {
            const m = safeError(e);
            const hardStop = /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND|not found|INVALID_ARGUMENT/i.test(m);
            if (hardStop || !transient.test(m) || n >= 3 || ms - (Date.now() - t0) < delay + 6000) throw e;
            await new Promise((r) => setTimeout(r, delay + Math.random() * 400));
            delay *= 2;
          }
        }
      };
      const attempt = (m: string) => withBackoff((left) => call(m, left));
      const runners = models.map((m) => attempt(m).catch((e) => { throw new Error(`${m}: ${safeError(e)}`); }));
      // independent second provider (free Groq key), raced alongside Gemini so one provider's outage cannot block the answer
      if (process.env.GROQ_API_KEY) runners.push(withBackoff((left) => callGroq(prompt, left, opts.temperature ?? 0.2)).catch((e) => { throw new Error(`groq: ${safeError(e)}`); }));
      return await Promise.any(runners);
    } catch (e) {
      const errs = (e as AggregateError).errors?.map((x: any) => String(x?.message ?? x)) ?? [safeError(e)];
      throw new Error(errs.join(" | ").slice(0, 700));
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
