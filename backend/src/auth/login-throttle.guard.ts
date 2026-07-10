import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { clientIp } from '../common/client-ip';

/**
 * Strict login throttle, on top of the global per-IP ThrottlerGuard. Because each login attempt
 * runs bcrypt (deliberately expensive), an attacker hammering one account is a compute-DoS +
 * credential-stuffing risk that the coarse global limit doesn't fully stop.
 *
 * Keyed on email + real client IP, NOT email alone: a per-email-only key would let any
 * unauthenticated attacker lock a victim out of their own account just by knowing their email.
 * The composite key isolates the legitimate user's own (email, their-IP) bucket from an
 * attacker's (email, attacker-IP) bucket, so an off-path attacker cannot deny the real owner.
 *
 * In-memory + single-instance is intentional for the self-hosted v1 (one API replica). If the
 * API is ever scaled horizontally, move this counter to Mongo/Redis so it is shared across nodes.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();
  private readonly windowMs = 15 * 60_000; // 15 minutes
  private readonly max = 10; // attempts per (email, ip) per window

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const email = String((req.body as { email?: unknown })?.email ?? '')
      .trim()
      .toLowerCase();
    // No email → let validation reject it; don't bucket empty keys.
    if (!email) return true;
    const key = `${email}|${clientIp(req)}`;

    const now = Date.now();
    const recent = (this.attempts.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );

    if (recent.length >= this.max) {
      throw new HttpException(
        'Te veel inlogpogingen voor dit account. Probeer het later opnieuw.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.attempts.set(key, recent);
    this.prune(now);
    return true;
  }

  /** Bound memory: drop fully-expired buckets when the map grows large. */
  private prune(now: number): void {
    if (this.attempts.size < 5000) return;
    for (const [k, times] of this.attempts) {
      if (times.every((t) => now - t >= this.windowMs)) this.attempts.delete(k);
    }
  }
}
