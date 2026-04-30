import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CuisineType } from '../entities/restaurant.entity';

export class MobileListRestaurantsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CuisineType, { message: 'نوع المطبخ غير مدعوم.' })
  cuisineType?: CuisineType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page يجب أن يكون رقماً صحيحاً.' })
  @Min(1, { message: 'page يجب أن يكون 1 على الأقل.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit يجب أن يكون رقماً صحيحاً.' })
  @Min(1, { message: 'limit يجب أن يكون 1 على الأقل.' })
  @Max(50, { message: 'limit لا يمكن أن يتجاوز 50.' })
  limit?: number = 10;
}
