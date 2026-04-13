import { IsEmail, IsMobilePhone, IsString, MinLength } from 'class-validator';

// Customer: phone → OTP → verify-otp for tokens
export class LoginCustomerDto {
  @IsMobilePhone()
  phone: string;
}

// Delivery agent: phone + password
export class LoginDeliveryDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  password: string;
}

// Restaurant owner: phone + password
export class LoginRestaurantDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  password: string;
}

// Manager: email + password
export class LoginManagerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
