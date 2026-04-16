import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CompleteCustomerProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  locationLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  locationLng: number;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
