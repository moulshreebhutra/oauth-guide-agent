/** Turns the agent's raw events into plain sentences, and raw provider errors into a readable explanation. */
export type Step = { id: number; state: "done" | "warn" | "error"; title: string; detail?: string };

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u.slice(0, 40); } };

export function friendlyTool(name: string, arg: string, result: string): { title: string; detail?: string; state: Step["state"] } {
  const none = /no Composio guide|none published|0 results|not found/i.test(result);
  switch (name) {
    case "check_composio_managed":
      return { title: /^yes/.test(result) ? `Composio can manage the OAuth app for ${arg}` : /^no/.test(result) ? `Composio cannot manage the OAuth app for ${arg}, so you register your own` : `Composio's managed-auth status for ${arg} is not stated`, detail: result.replace(/^(yes|no|unknown):\s*/, ""), state: "done" };
    case "composio_toolkit_page":
      return { title: `Read Composio's toolkit page for ${arg}`, detail: result, state: "done" };
    case "fetch_composio_guide":
      return { title: none ? `Composio has no setup guide for ${arg}` : `Read Composio's setup guide for ${arg}`, detail: none ? undefined : result, state: "done" };
    case "parent_platform_guide":
      return { title: `Used our researched ${arg} guide as evidence`, detail: result, state: "done" };
    case "search_web":
      return { title: `Searched the web for "${arg}"`, detail: result, state: "done" };
    case "fetch_page":
    {
      const thin = /^[0-9]{1,3} chars$/.test(result);
      return { title: thin ? `Read ${host(arg)}, but it has almost no readable text (the page is built by JavaScript)` : `Read ${host(arg)}`, detail: `${arg} (${result})`, state: thin ? "warn" : "done" };
    }
    case "probe_oauth_discovery":
      return { title: none ? "No public OAuth discovery document" : "Found the provider's OAuth discovery document", detail: result, state: "done" };
    default:
      return { title: `${name.replace(/_/g, " ")} ${arg}`.trim(), detail: result, state: "done" };
  }
}

/** Short plain-English reason for a failure, with the raw text kept for the "technical detail" fold. */
export function explainError(raw: string): { headline: string; fix: string[]; raw: string } {
  const r = raw.trim();
  const fix: string[] = [];
  let headline = "The agent could not finish this guide.";
  const mentions = (re: RegExp) => re.test(r);
  if (mentions(/search failed 403|search failed 4\d\d|duckduckgo/i)) {
    headline = "Web search was blocked, so the agent could not find the provider's pages.";
    fix.push("Add a free TAVILY_API_KEY (tavily.com) in Vercel and redeploy. Search then works reliably.");
    fix.push("Or paste the provider's developer-docs address instead of just a name.");
  }
  if (mentions(/429|RESOURCE_EXHAUSTED|quota/i)) {
    headline = "An AI provider is out of quota right now.";
    fix.push("Gemini's free tier is rate limited. Enable billing on the Google project, or rely on Claude and Groq.");
  }
  if (mentions(/claude: HTTP 401|invalid x-api-key|authentication_error/i)) {
    headline = "The Claude key was rejected.";
    fix.push("Check ANTHROPIC_API_KEY in Vercel: it must be a current key from console.anthropic.com. Redeploy after changing it.");
  } else if (mentions(/claude: HTTP 400|invalid_request_error/i)) {
    fix.push("Claude rejected the request. Check ANTHROPIC_MODEL, or whether the account has credit.");
  } else if (mentions(/claude: HTTP 40[23]|credit balance|billing/i)) {
    fix.push("Claude says the account has no usable credit. Add credit in the Anthropic console.");
  }
  if (mentions(/claude: empty answer/i)) fix.push("Claude returned no text, usually because the reply was cut short. This is being tuned; try again.");
  if (mentions(/openrouter: HTTP 404|openrouter: HTTP 40/i)) fix.push("OpenRouter's free model name has changed. Set OPENROUTER_MODEL to a model shown as free at openrouter.ai/models.");
  if (mentions(/time limit|no reply before|aborted|timeout|no time left/i) && !fix.length) {
    headline = "The AI models did not answer within the time limit.";
    fix.push("Try again. If it keeps happening, check /api/health to see which providers respond.");
  }
  if (mentions(/passed validation|quote/i) && !/claude|gemini|openrouter|groq/i.test(r)) {
    headline = "The guide was written but some claims could not be backed by the pages that were read, so nothing was shown.";
    fix.push("Try again, or give the provider's developer-docs address so the agent reads the right pages.");
  }
  if (!fix.length) fix.push("Try again. If it keeps failing, open /api/health and send the output.");
  return { headline, fix, raw: r };
}
