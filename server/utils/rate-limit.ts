import type { H3Event } from "h3";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function checkBucket(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  if (bucket.count > limit) {
    const retry = Math.ceil((bucket.resetAt - now) / 1000);
    throw createError({
      statusCode: 429,
      statusMessage: `Zu viele Anfragen. Bitte in ${retry}s erneut versuchen.`,
      data: { retryAfter: retry },
    });
  }
}

export function rateLimit(
  event: H3Event,
  key: string,
  limit: number,
  windowMs: number,
) {
  // Global backstop (all IPs combined) – prevents spoofed X-Forwarded-For bypass.
  // Allows 5× the per-IP limit to avoid false positives during normal use.
  checkBucket(`${key}:*`, limit * 5, windowMs);

  // Per-IP limit – prefer the socket address (trusted) over X-Forwarded-For
  // which can be spoofed unless a trusted reverse proxy overwrites it.
  const socketIp = event.node.req.socket?.remoteAddress || "";
  const forwardedIp = (
    getRequestHeader(event, "x-forwarded-for")?.split(",")[0] || ""
  ).trim();
  // Only trust X-Forwarded-For when the connection comes from a loopback/private
  // address (i.e., a local reverse proxy like Nginx or the Docker gateway).
  const isLocalProxy =
    socketIp === "127.0.0.1" ||
    socketIp === "::1" ||
    socketIp.startsWith("10.") ||
    socketIp.startsWith("172.") ||
    socketIp.startsWith("192.168.");
  const ip = isLocalProxy && forwardedIp ? forwardedIp : socketIp || "unknown";

  try {
    checkBucket(`${key}:${ip}`, limit, windowMs);
  } catch (err: any) {
    setResponseHeader(event, "Retry-After", err.data?.retryAfter ?? 60);
    throw err;
  }

  // Also propagate Retry-After for the global bucket error
}

// Periodic cleanup to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}, 60_000).unref?.();
