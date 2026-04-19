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
  @IsString({ message: 'الاسم الأول يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'الاسم الأول مطلوب.' })
  firstName: string;

  @IsString({ message: 'الاسم الأخير يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'الاسم الأخير مطلوب.' })
  lastName: string;

  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الميلاد غير صالح. يجب إدخاله بتنسيق ISO 8601.' })
  dateOfBirth?: string;

  @IsNumber({}, { message: 'خط العرض يجب أن يكون رقماً.' })
  @Min(-90, { message: 'خط العرض يجب أن يكون بين -90 و 90.' })
  @Max(90, { message: 'خط العرض يجب أن يكون بين -90 و 90.' })
  @Type(() => Number)
  locationLat: number;

  @IsNumber({}, { message: 'خط الطول يجب أن يكون رقماً.' })
  @Min(-180, { message: 'خط الطول يجب أن يكون بين -180 و 180.' })
  @Max(180, { message: 'خط الطول يجب أن يكون بين -180 و 180.' })
  @Type(() => Number)
  locationLng: number;

  @IsOptional()
  @IsString({ message: 'رابط الصورة يجب أن يكون نصاً.' })
  avatarUrl?: string;
}
