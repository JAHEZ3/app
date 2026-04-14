import {
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Step 1 of customer registration — phone only.
 * OTP is sent; password is never needed (OTP-based login).
 */
export class RegisterCustomerDto {
  @IsMobilePhone()
  phone: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

/**
 * Step 1 of delivery registration — phone only.
 * Password is set later via submit-request after OTP verification.
 */
export class RegisterDeliveryDto {
  @IsMobilePhone()
  phone: string;
}

/**
 * Step 1 of restaurant owner registration — phone only.
 * Password is set later via submit-request after OTP verification.
 */
export class RegisterRestaurantDto {
  @IsMobilePhone()
  phone: string;
}

/**
 * Manager accounts are created by existing managers — never self-registered.
 * Password is set at creation time; no OTP flow.
 */
export class RegisterManagerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}
