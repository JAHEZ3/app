import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Number)
  locationLat: number;

  @IsNumber()
  @Type(() => Number)
  locationLng: number;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
