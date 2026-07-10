/**
 * Resolve the real client IP. Behind the Cloudflare Tunnel the TCP peer is always cloudflared
 * on localhost, so Cloudflare's `CF-Connecting-IP` header carries the true client IP; we fall
 * back to Express's `req.ip` (correct once `trust proxy` is set) for local/dev traffic.
 *
 * SECURITY: this header is only trustworthy when the origin is reachable *exclusively* via the
 * tunnel (the documented deployment — no inbound ports). If the origin is ever exposed directly,
 * a client can spoof CF-Connecting-IP to evade per-IP rate limits; harden then with a Cloudflare
 * origin-cert / shared-secret header or a source-IP allowlist.
 */
export function clientIp(req: { headers?: Record<string, unknown>; ip?: string }): string {
  const cf = req.headers?.['cf-connecting-ip'];
  const cfIp = Array.isArray(cf) ? (cf[0] as string) : (cf as string | undefined);
  return cfIp || req.ip || 'unknown';
}
