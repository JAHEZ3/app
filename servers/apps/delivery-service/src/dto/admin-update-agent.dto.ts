import {
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { VehicleType } from "../entities/delivery-agent.entity";

export class AdminUpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsMobilePhone(undefined, undefined, { message: "رقم الهاتف غير صالح." })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsEnum(VehicleType, { message: "نوع المركبة غير مدعوم." })
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicleLicenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergencyContactName?: string;

  @IsOptional()
  @IsMobilePhone(undefined, undefined, { message: "رقم الطوارئ غير صالح." })
  emergencyContactPhone?: string;
}
