import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class LoginCustomerDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
