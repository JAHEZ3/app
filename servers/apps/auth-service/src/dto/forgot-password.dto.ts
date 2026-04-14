import { IsEmail, IsMobilePhone, IsOptional, ValidateIf } from 'class-validator';

/**
 * Forgot password — supply either phone (delivery/restaurant)
 * or email (manager). At least one must be present.
 */
export class ForgotPasswordDto {
  @ValidateIf((o) => !o.email)
  @IsMobilePhone()
  phone?: string;

  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;
}
