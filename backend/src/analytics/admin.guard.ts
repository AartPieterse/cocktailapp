import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Guards the LAN-only admin endpoints. Two independent defenses (both must pass):
 *
 *   1. **LAN-only:** any request that arrived through the Cloudflare Tunnel carries a
 *      `CF-Connecting-IP` header — those are rejected outright, so admin data is unreachable from
 *      the public internet even if the route were accidentally added to the tunnel ingress. Only
 *      direct LAN requests (no CF header) are considered.
 *   2. **Basic auth:** `ADMIN_USER` / `ADMIN_PASSWORD` from the environment. Fails closed — if
 *      either is unset, all admin access is denied.
 *
 * This is defense-in-depth on top of the deployment (the admin route is not mapped into the tunnel;
 * see deploy/README.md).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // (1) Reject anything that came via Cloudflare — admin is LAN-only.
    if (req.headers['cf-connecting-ip']) {
      throw new UnauthorizedException('Admin is alleen bereikbaar via het lokale netwerk.');
    }

    // (2) Basic auth, fail-closed.
    const user = this.config.get<string>('ADMIN_USER');
    const pass = this.config.get<string>('ADMIN_PASSWORD');
    if (!user || !pass) {
      throw new UnauthorizedException('Admin is niet geconfigureerd.');
    }

    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Basic ')) {
      throw new UnauthorizedException('Basic-auth vereist.');
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const givenUser = decoded.slice(0, idx);
    const givenPass = decoded.slice(idx + 1);
    if (givenUser !== user || givenPass !== pass) {
      throw new UnauthorizedException('Ongeldige inloggegevens.');
    }
    return true;
  }
}
