import { IsOptional, IsNumber, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deliveryRadiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  avgDeliveryMinutes?: number;
}
