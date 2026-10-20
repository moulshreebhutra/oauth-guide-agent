import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { Guide, lintGuide } from "./schema";

/**
 * Stateless share links. The whole guide travels inside the URL:
 *   token = base64url(deflate(json)) + "." + base64url(HMAC-SHA256(secret, payload))
 * Only this server (which holds SHARE_SECRET) can mint a token, so a link can only
 * ever contain a guide that passed enforce() here. No database, nothing stored.
 */
const MAX_COMPRESSED = 24_000; // bytes in the URL payload
const MAX_INFLATED = 120_000; // zip-bomb guard

const b64 = (b: Buffer) => b.toString("base64url");
const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest();

export function mintShareToken(guide: Guide, secret = process.env.SHARE_SECRET): string | null {
  if (!secret || secret.length < 16) return null;
  const payload = b64(deflateRawSync(Buffer.from(JSON.stringify(guide)), { level: 9 }));
  if (payload.length > MAX_COMPRESSED) return null;
  return `${payload}.${b64(sign(secret, payload))}`;
}

export type ShareResult = { ok: true; guide: Guide } | { ok: false; reason: string };

export function readShareToken(token: string, secret = process.env.SHARE_SECRET): ShareResult {
  if (!secret || secret.length < 16) return { ok: false, reason: "Sharing is not configured on this server." };
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined || payload.length > MAX_COMPRESSED) return { ok: false, reason: "This link is malformed." };
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return { ok: false, reason: "This link is malformed." };
  }
  const want = sign(secret, payload);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return { ok: false, reason: "This link was not issued by this site, or it was altered." };
  try {
    const json = inflateRawSync(Buffer.from(payload, "base64url"), { maxOutputLength: MAX_INFLATED }).toString("utf8");
    const parsed = Guide.safeParse(JSON.parse(json));
    if (!parsed.success) return { ok: false, reason: "The guide inside this link is not valid." };
    if (lintGuide(parsed.data).length) return { ok: false, reason: "The guide inside this link failed its consistency checks." };
    return { ok: true, guide: parsed.data };
  } catch {
    return { ok: false, reason: "This link could not be read." };
  }
}
