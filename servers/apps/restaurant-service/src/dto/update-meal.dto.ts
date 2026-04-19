import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMealDto {
  @IsOptional()
  @IsUUID('all', { message: 'معرف القسم غير صالح.' })
  sectionId?: string;

  @IsOptional()
  @IsString({ message: 'اسم الوجبة يجب أن يكون نصاً.' })
  @MaxLength(200, { message: 'اسم الوجبة لا يتجاوز 200 حرف.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'الوصف يجب أن يكون نصاً.' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'رابط الصورة يجب أن يكون نصاً.' })
  imageUrl?: string;

  @IsOptional()
  @IsNumber({}, { message: 'السعر الأساسي يجب أن يكون رقماً.' })
  @Min(0, { message: 'السعر الأساسي لا يمكن أن يكون سالباً.' })
  @Type(() => Number)
  basePrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'سعر الخصم يجب أن يكون رقماً.' })
  @Min(0, { message: 'سعر الخصم لا يمكن أن يكون سالباً.' })
  @Type(() => Number)
  discountPrice?: number;

  @IsOptional()
  @IsInt({ message: 'السعرات الحرارية يجب أن تكون عدداً صحيحاً.' })
  @Min(0, { message: 'السعرات الحرارية لا يمكن أن تكون سالبة.' })
  @Type(() => Number)
  calories?: number;

  @IsOptional()
  @IsBoolean({ message: 'حالة التوفر يجب أن تكون صح أو خطأ.' })
  isAvailable?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'حالة التميز يجب أن تكون صح أو خطأ.' })
  isFeatured?: boolean;

  @IsOptional()
  @IsArray({ message: 'الوسوم يجب أن تكون مصفوفة.' })
  @IsString({ each: true, message: 'كل وسم يجب أن يكون نصاً.' })
  tags?: string[];

  @IsOptional()
  @IsInt({ message: 'ترتيب العرض يجب أن يكون رقماً صحيحاً.' })
  @Min(0, { message: 'ترتيب العرض لا يمكن أن يكون سالباً.' })
  @Type(() => Number)
  displayOrder?: number;
}
