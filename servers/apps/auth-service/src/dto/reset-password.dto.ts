import { IsNotEmpty, IsString, IsUUID, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
