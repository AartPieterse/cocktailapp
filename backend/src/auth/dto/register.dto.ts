import type { RegisterRequest } from '@cocktailapp/shared';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Wachtwoord moet minstens 8 tekens zijn.' })
  @MaxLength(128)
  password: string;
}
