import { IsOptional, IsNumber, IsPositive, Min, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber({}, { message: 'خط العرض يجب أن يكون رقماً.' })
  @IsPositive({ message: 'خط العرض يجب أن يكون موجباً.' })
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'خط الطول يجب أن يكون رقماً.' })
  @IsPositive({ message: 'خط الطول يجب أن يكون موجباً.' })
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsNumber({}, { message: 'نطاق التوصيل يجب أن يكون رقماً.' })
  @Min(0, { message: 'نطاق التوصيل لا يمكن أن يكون سالباً.' })
  @Type(() => Number)
  deliveryRadiusKm?: number;

  @IsOptional()
  @IsNumber({}, { message: 'الحد الأدنى للطلب يجب أن يكون رقماً.' })
  @Min(0, { message: 'الحد الأدنى للطلب لا يمكن أن يكون سالباً.' })
  @Type(() => Number)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'وقت التوصيل يجب أن يكون رقماً.' })
  @Min(1, { message: 'وقت التوصيل يجب أن يكون دقيقة واحدة على الأقل.' })
  @Type(() => Number)
  avgDeliveryMinutes?: number;

  // Validated structurally in the service via validatePaymentInfo()
  @IsOptional()
  @IsObject({ message: 'بيانات الدفع غير صحيحة.' })
  paymentInfo?: Record<string, unknown>;
}
