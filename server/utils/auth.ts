import type { H3Event } from "h3";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "tbp_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

interface SessionPayload {
  exp: number;
}

function getSecret(): string {
  const cfg = useRuntimeConfig();
  const secret = (cfg.sessionSecret as string) || "";
  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage:
        "SESSION_SECRET ist nicht gesetzt. Server kann Admin-Sessions nicht signieren.",
    });
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload): string {
  const secret = getSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(data, secret);
  return `${data}.${sig}`;
}

function decodeSession(token: string): SessionPayload | null {
  try {
    const secret = getSecret();
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = sign(data, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdmin(event: H3Event): boolean {
  const cfg = useRuntimeConfig();
  if (!cfg.adminPassword || !cfg.sessionSecret) return false;
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return false;
  return decodeSession(token) !== null;
}

export function requireAdmin(event: H3Event) {
  if (!isAdmin(event)) {
    throw createError({ statusCode: 401, statusMessage: "Nicht autorisiert" });
  }
}

export function setAdminSession(event: H3Event) {
  const token = encodeSession({ exp: Date.now() + SESSION_TTL_MS });
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}

/**
 * Constant-time comparison that tolerates different lengths.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // still do a comparison to keep timing roughly stable
    timingSafeEqual(ab, Buffer.alloc(ab.length));
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function generateRandomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
