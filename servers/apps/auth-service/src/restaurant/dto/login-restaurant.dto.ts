import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class LoginRestaurantDto {
  @IsPhoneNumber()
  phoneNo: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
