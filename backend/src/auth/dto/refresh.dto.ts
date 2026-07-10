import type { RefreshRequest } from '@cocktailapp/shared';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto implements RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
