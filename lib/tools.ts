import { assertSafeUrl } from "./safety";
import { decodeEntities } from "./text";

const UA = "Mozilla/5.0 (compatible; OAuthGuideAgent/0.1; research bot for a take-home demo)";
const MAX_BYTES = 1_500_000;
const MAX_TEXT = 40_000;

export function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const text = html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m) => decodeEntities(m))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { title, text };
}

/** Fetch with SSRF checks on every redirect hop, size and time caps. */
export async function fetchPage(url: string): Promise<{ url: string; title: string; text: string; status: number; links: string[] }> {
  let current = (await assertSafeUrl(url)).toString();
  for (let hop = 0; hop < 4; hop++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12_000);
    const res = await fetch(current, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.5" } }).finally(() => clearTimeout(t));
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = (await assertSafeUrl(new URL(res.headers.get("location")!, current).toString())).toString();
      continue;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!/text|json|xml/.test(ct)) throw new Error(`unsupported content-type ${ct}`);
    const buf = await res.arrayBuffer();
    const raw = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
    const { title, text } = /html/.test(ct) ? htmlToText(raw) : { title: current, text: raw };
    const links: string[] = [];
    if (/html/.test(ct)) for (const m of raw.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) { try { const u = new URL(m[1].replace(/&amp;/g, "&"), current).toString(); if (!links.includes(u)) links.push(u); } catch {} if (links.length > 300) break; }
    return { url: current, title, text: text.slice(0, MAX_TEXT), status: res.status, links };
  }
  throw new Error("too many redirects");
}

/** Page text the search provider already read (Tavily returns it). Used when the site itself blocks our fetch behind a bot check. */
const SEARCH_TEXT = new Map<string, string>();
const BLOCKED = /just a moment|verify you are (a )?human|checking your browser|captcha|access denied|enable javascript and cookies|attention required/i;

/** fetchPage, but when the page comes back blocked or empty, use the text the search engine read instead (marked as such). */
export async function fetchReadable(url: string): Promise<{ url: string; title: string; text: string; status: number; links: string[] }> {
  const fallback = SEARCH_TEXT.get(url) ?? SEARCH_TEXT.get(url.replace(/\/$/, "")) ?? SEARCH_TEXT.get(url + "/");
  try {
    const p = await fetchPage(url);
    const bad = p.status >= 400 || p.text.length < 300 || (p.text.length < 3000 && BLOCKED.test(p.text.slice(0, 1500)));
    if (!bad || !fallback) return p;
    return { ...p, title: `${p.title || url} (text as read by the search engine; the site blocked our own fetch)`, text: fallback };
  } catch (e) {
    if (fallback) return { url, title: `${url} (text as read by the search engine; the site blocked our own fetch)`, text: fallback, status: 200, links: [] };
    throw e;
  }
}

/**
 * Web search. DuckDuckGo's free HTML endpoint is blocked (403) from most cloud hosts, so a search key is used when present:
 * TAVILY_API_KEY (free tier, tavily.com) or BRAVE_API_KEY (Brave Search API); DuckDuckGo is the keyless last resort.
 */
export async function searchWeb(query: string): Promise<{ title: string; url: string }[]> {
  const errs: string[] = [];
  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TAVILY_API_KEY}` }, body: JSON.stringify({ query, max_results: 8, search_depth: "basic", include_raw_content: "text" }), signal: AbortSignal.timeout(9_000) });
      if (!res.ok) throw new Error(`tavily ${res.status}`);
      const j: any = await res.json();
      for (const r of j.results ?? []) { const t = String(r.raw_content || r.content || ""); if (r.url && t.length > 200) SEARCH_TEXT.set(String(r.url), t.slice(0, MAX_TEXT)); }
      if (SEARCH_TEXT.size > 200) for (const k of [...SEARCH_TEXT.keys()].slice(0, 80)) SEARCH_TEXT.delete(k);
      const out = (j.results ?? []).map((r: any) => ({ title: String(r.title ?? r.url), url: String(r.url) })).filter((r: any) => /^https?:/.test(r.url));
      if (out.length) return out;
    } catch (e: any) { errs.push(String(e?.message ?? e)); }
  }
  if (process.env.BRAVE_API_KEY) {
    try {
      const res = await fetch("https://api.search.brave.com/res/v1/web/search?count=8&q=" + encodeURIComponent(query), { headers: { "x-subscription-token": process.env.BRAVE_API_KEY, accept: "application/json" }, signal: AbortSignal.timeout(9_000) });
      if (!res.ok) throw new Error(`brave ${res.status}`);
      const j: any = await res.json();
      const out = (j.web?.results ?? []).map((r: any) => ({ title: String(r.title ?? r.url), url: String(r.url) }));
      if (out.length) return out;
    } catch (e: any) { errs.push(String(e?.message ?? e)); }
  }
  const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`search failed ${res.status}${errs.length ? " (" + errs.join("; ") + ")" : ""}${process.env.TAVILY_API_KEY || process.env.BRAVE_API_KEY ? "" : ": add TAVILY_API_KEY for reliable search"}`);
  const html = await res.text();
  const out: { title: string; url: string }[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 8) {
    let href = m[1].replace(/&amp;/g, "&");
    const u = href.match(/[?&]uddg=([^&]+)/);
    if (u) href = decodeURIComponent(u[1]);
    if (href.startsWith("//")) href = "https:" + href;
    out.push({ title: m[2].replace(/<[^>]+>/g, "").trim(), url: href });
  }
  return out;
}

/** OAuth/OIDC discovery documents are machine-readable facts about endpoints, grant types and scopes. */
export async function probeOAuthDiscovery(domain: string) {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const paths = ["/.well-known/openid-configuration", "/.well-known/oauth-authorization-server"];
  const found: { url: string; title: string; text: string }[] = [];
  for (const p of paths) {
    try {
      const r = await fetchPage(`https://${host}${p}`);
      if (r.status === 200 && r.text.includes("{")) found.push({ url: r.url, title: `OAuth discovery document (${host})`, text: r.text });
    } catch {
      /* not published */
    }
  }
  return found;
}

/** Composio's managed-auth flag for a toolkit. Needs COMPOSIO_API_KEY; response shape is unverified, so we only report what we can read. */
export async function checkComposioManaged(slug: string): Promise<{ status: "yes" | "no" | "unknown"; note: string }> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    // no API key: read Composio's public toolkit docs page instead
    const page = await composioToolkit(slug);
    if (page && page.status !== "unknown") return { status: page.status, note: `Composio's toolkit page lists ${page.methods.join(", ") || "its auth methods"} and says "Composio-managed OAuth ${page.status === "yes" ? "available" : "not available"}".` };
    return { status: "unknown", note: page ? "Composio's toolkit page was found but does not state managed-auth status." : `No Composio toolkit page found for '${slug}'.` };
  }
  try {
    const res = await fetch(`https://backend.composio.dev/api/v3.1/toolkits/${encodeURIComponent(slug)}`, { headers: { "x-api-key": key } });
    if (res.status === 404) return { status: "unknown", note: `No Composio toolkit named '${slug}' was found.` };
    if (!res.ok) return { status: "unknown", note: `Composio API returned ${res.status}.` };
    const j: any = await res.json();
    const schemes = j.composio_managed_auth_schemes ?? j.composioManagedAuthSchemes;
    if (Array.isArray(schemes)) return schemes.length ? { status: "yes", note: `Composio API lists managed auth schemes: ${schemes.join(", ")}.` } : { status: "no", note: "Composio API lists no managed auth schemes for this toolkit." };
    return { status: "unknown", note: "Composio toolkit found but the managed-auth field was not present in the response." };
  } catch (e: any) {
    return { status: "unknown", note: `Composio lookup failed: ${e.message}` };
  }
}


/** Pure parser so it can be tested offline: what does Composio's toolkit page say about auth? */
export function parseComposioToolkit(text: string): { status: "yes" | "no" | "unknown"; methods: string[] } {
  const status = /Composio-managed OAuth not available/i.test(text) ? "no" : /Composio-managed OAuth available/i.test(text) ? "yes" : "unknown";
  const methods = [...new Set((text.match(/\b(OAuth2|OAUTH2|S2S_OAUTH2|API[_ ]?KEY|BEARER_TOKEN|BASIC|OAuth1)\b/g) ?? []).map((m) => m.replace("OAUTH2", "OAuth2").replace("API_KEY", "API Key")))];
  return { status, methods };
}

/** Composio's public toolkit docs page. States auth methods and whether Composio manages the OAuth app, no API key needed. */
export async function composioToolkit(name: string): Promise<{ url: string; title: string; text: string; status: "yes" | "no" | "unknown"; methods: string[] } | null> {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tries = [...new Set([base, base.replace(/(inc|app|api)$/, "")])].filter((x) => x.length > 1);
  for (const slug of tries) {
    try {
      const r = await fetchPage(`https://docs.composio.dev/toolkits/${slug}`);
      if (r.status !== 200 || !/Authentication/i.test(r.text)) continue;
      return { url: r.url, title: r.title || `Composio docs - ${slug}`, text: r.text.slice(0, 6000), ...parseComposioToolkit(r.text) };
    } catch {
      /* no such toolkit page */
    }
  }
  return null;
}
