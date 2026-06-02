import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAddressDto {
  @IsOptional()
  @IsString({ message: "التسمية يجب أن تكون نصاً." })
  @MaxLength(50)
  label?: string;

  @IsString({ message: "اسم الشارع يجب أن يكون نصاً." })
  @IsNotEmpty({ message: "اسم الشارع مطلوب." })
  street: string;

  @IsOptional()
  @IsString({ message: "المدينة يجب أن تكون نصاً." })
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString({ message: "البناية يجب أن تكون نصاً." })
  @MaxLength(80)
  building?: string;

  @IsOptional()
  @IsString({ message: "الطابق يجب أن يكون نصاً." })
  @MaxLength(40)
  floor?: string;

  @IsOptional()
  @IsString({ message: "ملاحظات التوصيل يجب أن تكون نصاً." })
  notes?: string;

  @IsNumber({}, { message: "خط العرض يجب أن يكون رقماً." })
  @Min(-90, { message: "خط العرض يجب أن يكون بين -90 و 90." })
  @Max(90, { message: "خط العرض يجب أن يكون بين -90 و 90." })
  @Type(() => Number)
  lat: number;

  @IsNumber({}, { message: "خط الطول يجب أن يكون رقماً." })
  @Min(-180, { message: "خط الطول يجب أن يكون بين -180 و 180." })
  @Max(180, { message: "خط الطول يجب أن يكون بين -180 و 180." })
  @Type(() => Number)
  lng: number;

  @IsOptional()
  @IsBoolean({ message: "إعداد العنوان الافتراضي يجب أن يكون قيمة منطقية." })
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  building?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
