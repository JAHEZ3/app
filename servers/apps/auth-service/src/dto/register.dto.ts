import {
  IsMobilePhone,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterCustomerDto {
  @IsMobilePhone()
  phone: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

// Restaurant owner sets their own password at registration.
export class RegisterRestaurantDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Delivery agent sets their own password at registration.
export class RegisterDeliveryDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Manager created by another manager — sets own password at creation.
export class RegisterManagerDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}
