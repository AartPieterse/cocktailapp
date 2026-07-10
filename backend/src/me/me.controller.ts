import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { MeData } from '@cocktailapp/shared';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { UsersService } from '../users/users.service';
import { UpdateMeDataDto } from './dto/update-me-data.dto';
import { MeService } from './me.service';

/** Everything here is scoped to the authenticated user by their token — never a path param. */
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('data')
  getData(@CurrentUser() user: AuthenticatedUser): Promise<MeData> {
    return this.meService.getData(user.userId);
  }

  @Put('data')
  async putData(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDataDto,
  ): Promise<MeData> {
    // An access token stays valid for its short TTL even after DELETE /api/me. Since putData
    // upserts, a lingering token (or an in-flight background sync) could otherwise re-create an
    // orphaned data doc for a deleted account — defeating the "wipe ALL data" guarantee. Reject
    // writes for a user that no longer exists.
    const exists = await this.usersService.findById(user.userId);
    if (!exists) throw new UnauthorizedException('Account bestaat niet meer.');
    return this.meService.putData(user.userId, dto);
  }

  /** GDPR + Play requirement: wipe the account and ALL its data. */
  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.meService.deleteForUser(user.userId);
    await this.authService.revokeAllForUser(user.userId);
    await this.usersService.deleteById(user.userId);
  }
}
