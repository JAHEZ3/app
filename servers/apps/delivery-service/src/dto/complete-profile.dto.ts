import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { VehicleType } from "../entities/delivery-agent.entity";

export class ApplicationAnswerDto {
  @IsString({ message: 'السؤال يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'السؤال مطلوب.' })
  question: string;

  @IsString({ message: 'الإجابة يجب أن تكون نصاً.' })
  @IsNotEmpty({ message: 'الإجابة مطلوبة.' })
  answer: string;
}

export class CompleteDeliveryProfileDto {
  /** Set here for the first time — stored in auth-service via NATS 'user.password.set'. */
  @IsString({ message: 'كلمة المرور يجب أن تكون نصاً.' })
  @MinLength(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' })
  password: string;

  @IsString({ message: 'الاسم الأول يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'الاسم الأول مطلوب.' })
  firstName: string;

  @IsString({ message: 'الاسم الأخير يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'الاسم الأخير مطلوب.' })
  lastName: string;

  @IsDateString({}, { message: 'تاريخ الميلاد غير صالح. يجب إدخاله بتنسيق ISO 8601.' })
  dateOfBirth: string;

  @IsString({ message: 'رقم الهوية يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'رقم الهوية مطلوب.' })
  nationalIdNumber: string;

  @IsString({ message: 'المدينة يجب أن تكون نصاً.' })
  @IsNotEmpty({ message: 'المدينة مطلوبة.' })
  city: string;

  @IsEnum(VehicleType, {
    message: 'نوع المركبة غير مدعوم. الأنواع المتاحة: motorcycle، bicycle، car، on_foot.',
  })
  vehicleType: VehicleType;

  /** Required when vehicleType is 'car', optional otherwise. */
  @ValidateIf((o) => o.vehicleType === VehicleType.CAR)
  @IsString({ message: 'رقم رخصة القيادة يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'رقم رخصة القيادة مطلوب للمركبات.' })
  vehicleLicenseNumber?: string;

  @IsString({ message: 'اسم جهة الطوارئ يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'اسم جهة الطوارئ مطلوب.' })
  emergencyContactName: string;

  @IsMobilePhone(undefined, undefined, { message: 'رقم هاتف الطوارئ غير صالح.' })
  emergencyContactPhone: string;

  @IsString({ message: 'معلومات الدفع مطلوبة.' })
  @IsNotEmpty({ message: 'معلومات الدفع مطلوبة.' })
  paymentInfo: string;

  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean({ message: 'يجب قبول الشروط والأحكام.' })
  termsAccepted: boolean;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value); } catch { return null; }
  })
  @IsArray({ message: 'يجب أن تكون الإجابات مصفوفة.' })
  answers: ApplicationAnswerDto[];
}
