import net from "node:net";
import dns from "node:dns/promises";

/** Collapse whitespace/quotes/dashes so a quote can be matched against page text. */
export function norm(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True only if the excerpt literally appears in the page text (after normalisation). */
export function excerptAppearsIn(excerpt: string, pageText: string): boolean {
  const e = norm(excerpt);
  if (e.length < 12) return false; // too short to be meaningful evidence
  return norm(pageText).includes(e);
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:");
  }
  return true;
}

/** Block non-http(s), credentials in URL, odd ports, and hosts that resolve to private/loopback addresses. */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid url");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("only http(s) allowed");
  if (u.username || u.password) throw new Error("credentials in url not allowed");
  if (u.port && !["80", "443", ""].includes(u.port)) throw new Error("port not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("host not allowed");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("private address not allowed");
    return u;
  }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("host resolves to a private address");
  return u;
}

/** A user-supplied app name or website becomes a short, safe string used in prompts. */
export function cleanAppInput(input: string): { name: string; site?: string } | null {
  const s = input.trim().slice(0, 120);
  if (s.length < 2) return null;
  if (/[\u0000-\u001f<>{}`]/.test(s)) return null;
  const m = s.match(/^(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(?:\/.*)?$/i);
  if (m) return { name: m[1].replace(/^www\./, ""), site: m[1].replace(/^www\./, "") };
  return { name: s };
}

/** Naive in-memory limiter. On serverless this is per-instance, so it is best-effort only. */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
