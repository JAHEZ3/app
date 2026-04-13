import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class HourEntryDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'openTime must be HH:MM' })
  openTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'closeTime must be HH:MM' })
  closeTime: string;
}

export class SetHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourEntryDto)
  hours: HourEntryDto[];
}
