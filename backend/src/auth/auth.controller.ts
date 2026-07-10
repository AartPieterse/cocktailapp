import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, AuthUser } from '@cocktailapp/shared';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt-payload';
import { LoginThrottleGuard } from './login-throttle.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Dedicated tight per-IP limit (10/min) on top of the global 120/min: register runs a
  // cost-12 bcrypt hash, so it is a compute-DoS target that no per-account throttle can cover
  // (every attempt is a new email). NOTE: a 409 on an existing email is deliberate UX and does
  // reveal that an account exists — true enumeration-resistance needs the deferred email-
  // verification flow, so it is out of scope for v1.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto.email, dto.password);
  }

  @UseGuards(LoginThrottleGuard)
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.auth.me(user.userId);
  }
}
