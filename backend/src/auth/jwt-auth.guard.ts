import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AccessTokenPayload, AuthenticatedUser } from './jwt-payload';

/**
 * Hand-rolled bearer-token guard: verify the access token with the access secret (the JwtModule
 * default) and attach `{ userId, email }` to the request. Refresh tokens are signed with a
 * different secret, so they cannot be replayed here as access tokens.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Ontbrekend of ongeldig autorisatietoken.');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token);
      const user: AuthenticatedUser = { userId: payload.sub, email: payload.email };
      (req as Request & { user?: AuthenticatedUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Token is ongeldig of verlopen.');
    }
  }
}
