import { GoogleGenAI } from "@google/genai";

/** One place that calls Gemini: tries the configured model, then free-tier fallbacks, and reports WHY it failed. */
const FALLBACKS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

export const safeError = (e: unknown) =>
  String((e as any)?.message ?? e)
    .replace(/^This operation was aborted$/i, "no reply before the time limit")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .slice(0, 220);

async function callOpenRouter(prompt: string, ms: number, temperature: number): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free", temperature, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const j: any = await res.json();
  const t = j?.choices?.[0]?.message?.content;
  if (!t) throw new Error("empty answer");
  return String(t);
}

async function callGroq(prompt: string, ms: number, temperature: number): Promise<string> {
  // Groq retires models from time to time, so try the configured one, then current alternatives
  const models = [process.env.GROQ_MODEL, "openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"].filter(Boolean) as string[];
  let last = "";
  for (const model of [...new Set(models)]) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model, temperature, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(ms),
    });
    if (res.ok) {
      const t = (await res.json() as any)?.choices?.[0]?.message?.content;
      if (t) return String(t);
      last = `${model}: empty answer`;
      continue;
    }
    last = `HTTP ${res.status} ${(await res.text()).slice(0, 120)}`;
    if (res.status !== 404 && res.status !== 400) throw new Error(last); // quota/auth/overload: another model will not help
  }
  throw new Error(last);
}

async function callAnthropic(prompt: string, ms: number, temperature: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 900, temperature, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  const j: any = await res.json();
  const t = j?.content?.map((c: any) => c.text ?? "").join("");
  if (!t) throw new Error("empty answer");
  return String(t);
}

/** Amazon Bedrock Converse with a Bedrock API key (bearer token). Works with any Bedrock chat model you have enabled. */
async function callBedrock(prompt: string, ms: number, temperature: number): Promise<string> {
  const region = process.env.BEDROCK_REGION || "us-east-1";
  const model = process.env.BEDROCK_MODEL_ID || "us.amazon.nova-lite-v1:0";
  const res = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}` },
    body: JSON.stringify({ messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 900, temperature } }),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  const j: any = await res.json();
  const t = j?.output?.message?.content?.map((c: any) => c.text ?? "").join("");
  if (!t) throw new Error("empty answer");
  return String(t);
}

/** xAI Grok (OpenAI-compatible endpoint). Model is set with XAI_MODEL. */
async function callXai(prompt: string, ms: number, temperature: number): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.XAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.XAI_MODEL || "grok-4", temperature, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  const j: any = await res.json();
  const t = j?.choices?.[0]?.message?.content;
  if (!t) throw new Error("empty answer");
  return String(t);
}

let lastPaidErr = "";
type GenOpts = { json?: boolean; timeoutMs?: number; temperature?: number; models?: string[]; deadlineMs?: number; race?: boolean; fast?: boolean; only?: "gemini" };

/**
 * Public entry. Providers are tried in three tiers, one provider per tier:
 *   1) Claude or Groq (a coin flip, so load is shared)   2) Gemini or OpenRouter (coin flip)   3) Claude, as the last resort.
 * Bedrock and Grok, if configured, join tier 1. A tier with nothing configured is skipped. Every failure is reported by name,
 * so a wrong key, no credit or a bad model name is visible instead of hidden behind another provider's error.
 */
export async function generate(prompt: string, opts: GenOpts = {}): Promise<string> {
  const started = Date.now();
  const total = Math.min(opts.deadlineMs ?? opts.timeoutMs ?? 28_000, 50_000);
  const temp = opts.temperature ?? 0.2;
  const p = opts.json ? `${prompt}\n\nReturn ONLY valid JSON: no prose before or after it and no code fences.` : prompt;
  const env = process.env;
  const run: Record<string, (ms: number) => Promise<string>> = {
    claude: (ms) => callAnthropic(p, ms, temp),
    groq: (ms) => callGroq(p, ms, temp),
    bedrock: (ms) => callBedrock(p, ms, temp),
    grok: (ms) => callXai(p, ms, temp),
    openrouter: (ms) => callOpenRouter(p, ms, temp),
    gemini: (ms) => generateCore(p, { ...opts, only: "gemini", race: true, fast: true, timeoutMs: ms, deadlineMs: ms }),
  };
  const have: Record<string, boolean> = { claude: !!env.ANTHROPIC_API_KEY, groq: !!env.GROQ_API_KEY, bedrock: !!env.AWS_BEARER_TOKEN_BEDROCK, grok: !!env.XAI_API_KEY, openrouter: !!env.OPENROUTER_API_KEY, gemini: !!env.GEMINI_API_KEY };
  const tiers = [["claude", "groq", "bedrock", "grok"], ["gemini", "openrouter"], ["claude"]].map((t) => t.filter((n) => have[n])).filter((t) => t.length);
  if (!tiers.length) throw new Error("No AI model is configured on the server");
  const errors: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < tiers.length; i++) {
    // within a tier, a random configured provider that has not already failed (the last tier may repeat Claude on purpose)
    const pool = tiers[i].filter((n) => !used.has(n) || i === tiers.length - 1);
    if (!pool.length) continue;
    const name = pool[Math.floor(Math.random() * pool.length)];
    const left = total - (Date.now() - started);
    if (left < 3000) { errors.push(`${name}: no time left`); break; }
    const share = Math.max(3000, Math.floor(left / (tiers.length - i)));
    try { return await run[name](Math.min(share, 20_000)); }
    catch (e) { errors.push(`${name}: ${safeError(e)}`); used.add(name); }
  }
  throw new Error(errors.join(" | ").slice(0, 900));
}

async function generateCore(
  prompt: string,
  opts: GenOpts = {},
): Promise<string> {
  // Paid primaries (Anthropic API and/or Amazon Bedrock) race each other; free providers below are the backup.
  let primaryErr = "";
  const paid: Promise<string>[] = [];
  const budget = Math.min(opts.timeoutMs ?? 25_000, opts.deadlineMs ?? 25_000, 30_000);
  const twice = (name: string, f: (ms: number) => Promise<string>) => (async () => {
    const t0 = Date.now();
    let last = "";
    for (let n = 0; n < 2; n++) {
      const left = budget - (Date.now() - t0);
      if (left < 3000) break;
      try { return await f(Math.min(left, 18_000)); }
      catch (e) { last = `${name}: ${safeError(e)}`; if (/HTTP 40[0134]/.test(last)) break; await new Promise((r) => setTimeout(r, 500)); }
    }
    throw new Error(last || `${name}: no time left`);
  })();
  if (process.env.ANTHROPIC_API_KEY) paid.push(twice("claude", (ms) => callAnthropic(prompt, ms, opts.temperature ?? 0.2)));
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) paid.push(twice("bedrock", (ms) => callBedrock(prompt, ms, opts.temperature ?? 0.2)));
  if (process.env.XAI_API_KEY) paid.push(twice("grok", (ms) => callXai(prompt, ms, opts.temperature ?? 0.2)));
  if (paid.length && !opts.only) {
    try { return await Promise.any(paid); }
    catch (e) { primaryErr = ((e as AggregateError).errors ?? []).map((x: any) => x.message).join(" | "); lastPaidErr = primaryErr; }
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) throw new Error(primaryErr);
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key && !opts.only && (process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY)) {
    const rs: Promise<string>[] = [];
    if (process.env.GROQ_API_KEY) rs.push(callGroq(prompt, 15_000, opts.temperature ?? 0.2));
    if (process.env.OPENROUTER_API_KEY) rs.push(callOpenRouter(prompt, 15_000, opts.temperature ?? 0.2));
    try { return await Promise.any(rs); } catch { throw new Error([primaryErr, "free providers failed"].filter(Boolean).join(" | ")); }
  }
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
      if (process.env.GROQ_API_KEY && !opts.only) runners.push(withBackoff((left) => callGroq(prompt, left, opts.temperature ?? 0.2)).catch((e) => { throw new Error(`groq: ${safeError(e)}`); }));
      if (process.env.OPENROUTER_API_KEY && !opts.only) runners.push(withBackoff((left) => callOpenRouter(prompt, left, opts.temperature ?? 0.2)).catch((e) => { throw new Error(`openrouter: ${safeError(e)}`); }));
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

/** True when any text model is configured. */
export const hasModel = () => !!(process.env.ANTHROPIC_API_KEY || process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.XAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
