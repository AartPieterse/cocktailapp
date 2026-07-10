import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { clientIp } from './client-ip';

/**
 * Rate-limit by the REAL client IP (see `clientIp`): keying on the socket IP would bucket every
 * tunnelled user together, so we prefer Cloudflare's `CF-Connecting-IP`, falling back to `req.ip`.
 */
@Injectable()
export class CfThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(clientIp(req));
  }
}
