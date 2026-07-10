import type { LoginRequest } from '@cocktailapp/shared';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto implements LoginRequest {
  @IsEmail()
  @MaxLength(254)
  email: string;

  // No length rule on login — that only leaks the password policy. Just require a value.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
