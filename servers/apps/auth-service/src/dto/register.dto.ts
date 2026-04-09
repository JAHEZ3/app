import {
  IsDateString,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterCustomerDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsNumber()
  @Type(() => Number)
  locationLat: number;

  @IsNumber()
  @Type(() => Number)
  locationLng: number;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;
}

// Restaurant self-registers with phone only — no password.
// A system-generated password is sent after manager approval.
export class RegisterRestaurantDto {
  @IsString()
  @IsNotEmpty()
  restaurantName: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsMobilePhone()
  primaryPhone: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class RegisterDeliveryDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(['freelancer', 'company_employee'])
  agentType: 'freelancer' | 'company_employee';
}

// Delivery company self-registers — password system-generated on approval.
export class RegisterDeliveryCompanyDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsEnum(['partner_company', 'in_house'])
  contractType: 'partner_company' | 'in_house';
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
