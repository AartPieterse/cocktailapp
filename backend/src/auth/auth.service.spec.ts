/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';

function execMock(value: unknown) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('AuthService', () => {
  let service: AuthService;
  let users: any;
  let jwt: any;
  let config: any;
  let refreshModel: any;

  const fixedDate = new Date('2020-01-01T00:00:00.000Z');

  function makeUser(passwordHash: string) {
    return {
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      passwordHash,
      get: () => fixedDate,
    };
  }

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
    };
    jwt = {
      // Distinguish the two tokens by payload shape (refresh carries a jti).
      sign: jest.fn((payload: any) => ('jti' in payload ? 'refresh.jwt' : 'access.jwt')),
      verify: jest.fn(),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    config = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
      get: jest.fn().mockReturnValue('30d'),
    };
    refreshModel = {
      create: jest.fn().mockResolvedValue({}),
      findOneAndDelete: jest.fn(),
      deleteOne: jest.fn().mockReturnValue(execMock(undefined)),
      deleteMany: jest.fn().mockReturnValue(execMock(undefined)),
    };
    service = new AuthService(users, jwt, config, refreshModel);
  });

  describe('register', () => {
    it('hashes the password, creates the user, issues + stores tokens', async () => {
      users.create.mockImplementation((_email: string, hash: string) =>
        Promise.resolve(makeUser(hash)),
      );

      const res = await service.register('User@Example.com', 'password123');

      const [, hashArg] = users.create.mock.calls[0];
      expect(await bcrypt.compare('password123', hashArg)).toBe(true); // stored a bcrypt hash, not plaintext
      expect(res.tokens).toEqual({ accessToken: 'access.jwt', refreshToken: 'refresh.jwt' });
      expect(res.user.email).toBe('user@example.com');
      expect(refreshModel.create).toHaveBeenCalledTimes(1); // refresh session persisted
    });

    it('maps a duplicate-email index violation to 409 Conflict', async () => {
      users.create.mockRejectedValue({ code: 11000 });
      await expect(service.register('a@b.com', 'password123')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('rejects an unknown email with the same error as a wrong password', async () => {
      // (The service still runs a bcrypt compare against a dummy hash to flatten timing and
      // avoid a user-enumeration oracle — see AuthService.login.)
      users.findByEmail.mockResolvedValue(null);
      await expect(service.login('nobody@x.com', 'whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(makeUser(await bcrypt.hash('correct-pass', 12)));
      await expect(service.login('user@example.com', 'wrong-pass')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues tokens on correct credentials', async () => {
      users.findByEmail.mockResolvedValue(makeUser(await bcrypt.hash('correct-pass', 12)));
      const res = await service.login('user@example.com', 'correct-pass');
      expect(res.tokens.accessToken).toBe('access.jwt');
      expect(refreshModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('rotates: consumes the presented jti and issues a new pair', async () => {
      const user = makeUser('x');
      jwt.verify.mockReturnValue({ sub: String(user._id), jti: 'jti-1' });
      refreshModel.findOneAndDelete.mockReturnValue(execMock({ jti: 'jti-1' }));
      users.findById.mockResolvedValue(user);

      const res = await service.refresh('refresh.jwt');

      expect(refreshModel.findOneAndDelete).toHaveBeenCalledWith({ jti: 'jti-1' });
      expect(res.tokens.refreshToken).toBe('refresh.jwt');
      expect(refreshModel.create).toHaveBeenCalledTimes(1); // new session stored
    });

    it('rejects a revoked/already-rotated token (jti not found)', async () => {
      jwt.verify.mockReturnValue({ sub: 'x', jti: 'gone' });
      refreshModel.findOneAndDelete.mockReturnValue(execMock(null));
      await expect(service.refresh('refresh.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unverifiable token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad signature');
      });
      await expect(service.refresh('tampered')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the account no longer exists', async () => {
      jwt.verify.mockReturnValue({ sub: new Types.ObjectId().toString(), jti: 'j' });
      refreshModel.findOneAndDelete.mockReturnValue(execMock({ jti: 'j' }));
      users.findById.mockResolvedValue(null);
      await expect(service.refresh('refresh.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout / revoke', () => {
    it('revokes the presented refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'x', jti: 'j2' });
      await service.logout('refresh.jwt');
      expect(refreshModel.deleteOne).toHaveBeenCalledWith({ jti: 'j2' });
    });

    it('is a no-op for an invalid token (does not throw)', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      await expect(service.logout('bad')).resolves.toBeUndefined();
    });

    it('revokes every session for a user on account deletion', async () => {
      const id = new Types.ObjectId().toString();
      await service.revokeAllForUser(id);
      expect(refreshModel.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
