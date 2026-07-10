import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginThrottleGuard } from './login-throttle.guard';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    // Default (access-token) signing config; refresh tokens override secret + expiry per-call.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        // Fail fast on the copy-paste footgun: the "a refresh token can't be replayed as an
        // access token" guarantee (JwtAuthGuard) rests entirely on these two secrets differing.
        const refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
        if (secret === refreshSecret) {
          throw new Error(
            'JWT_SECRET and JWT_REFRESH_SECRET must be different values.',
          );
        }
        return {
          secret,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ms StringValue type rejects a plain string
          signOptions: {
            expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, LoginThrottleGuard],
  // Exported so MeModule can guard its routes with the same JwtAuthGuard (and JwtService).
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
