import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class LoginDeliveryDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
