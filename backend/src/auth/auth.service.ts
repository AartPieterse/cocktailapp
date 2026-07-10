import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { AuthResponse, AuthUser } from '@cocktailapp/shared';
// bcryptjs (pure-JS) rather than the plan's native `bcrypt`: same bcrypt algorithm, but no native
// build toolchain — simpler multi-stage Docker (Part C) and Windows dev, at a modest CPU cost that
// the register/login throttles bound on the single-replica host.
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RefreshTokenPayload } from './jwt-payload';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';

const BCRYPT_COST = 12;
/** Fixed dummy hash compared against when the email is unknown, to flatten login timing. */
const DUMMY_HASH = bcrypt.hashSync('no-such-user-timing-guard', BCRYPT_COST);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshModel: Model<RefreshTokenDocument>,
  ) {}

  private get refreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private get refreshExpires(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '30d';
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    try {
      const user = await this.users.create(email, passwordHash);
      return this.issueTokens(user);
    } catch (err) {
      if (this.isDuplicateKey(err)) {
        throw new ConflictException(
          'Er bestaat al een account met dit e-mailadres.',
        );
      }
      throw err;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.users.findByEmail(email);
    // Always run a bcrypt compare (real hash or dummy) so response time doesn't reveal
    // whether the email exists.
    const ok = await bcrypt.compare(
      password,
      user ? user.passwordHash : DUMMY_HASH,
    );
    if (!user || !ok) {
      throw new UnauthorizedException('Ongeldige inloggegevens.');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Ongeldige of verlopen sessie.');
    }

    // Rotation: consume the jti atomically. A missing record means the token was already
    // used (rotated) or revoked — reject and force re-login.
    const consumed = await this.refreshModel
      .findOneAndDelete({ jti: payload.jti })
      .exec();
    if (!consumed) {
      throw new UnauthorizedException('Sessie is verlopen of ingetrokken.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account bestaat niet meer.');
    }
    return this.issueTokens(user);
  }

  /** Best-effort revoke of the presented refresh token (idempotent). */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
      await this.refreshModel.deleteOne({ jti: payload.jti }).exec();
    } catch {
      // Token already invalid/expired — nothing to revoke.
    }
  }

  /** Revoke every session for a user (used on account deletion). */
  async revokeAllForUser(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    await this.refreshModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Account bestaat niet meer.');
    return this.toAuthUser(user);
  }

  private async issueTokens(user: UserDocument): Promise<AuthResponse> {
    const userId = String(user._id);
    const accessToken = this.jwt.sign({ sub: userId, email: user.email });

    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, jti },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ms StringValue type rejects a plain string
      { secret: this.refreshSecret, expiresIn: this.refreshExpires as any },
    );
    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.refreshModel.create({
      userId: user._id,
      jti,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return { user: this.toAuthUser(user), tokens: { accessToken, refreshToken } };
  }

  private toAuthUser(user: UserDocument): AuthUser {
    return {
      id: String(user._id),
      email: user.email,
      createdAt: (user.get('createdAt') as Date | undefined)?.toISOString(),
      updatedAt: (user.get('updatedAt') as Date | undefined)?.toISOString(),
    };
  }

  private isDuplicateKey(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: number }).code === 11000
    );
  }
}
