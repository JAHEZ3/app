import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class ResendOtpDto {
  @IsUUID()
  userId: string;
}
