import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsMobilePhone } from 'class-validator';

export class VerifyOtpDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

export class ResendOtpDto {
  @IsMobilePhone()
  phone: string;
}
