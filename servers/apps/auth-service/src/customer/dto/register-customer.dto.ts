import { IsString, IsNotEmpty, IsPhoneNumber, IsDateString, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName: string;

  @IsPhoneNumber()
  mobileNo: string;

  @IsDateString()
  birthdate: string;
}
