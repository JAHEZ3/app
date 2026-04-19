import { IsNotEmpty, IsString } from 'class-validator';

export class RejectApplicationDto {
  @IsString({ message: 'سبب الرفض يجب أن يكون نصاً.' })
  @IsNotEmpty({ message: 'سبب الرفض مطلوب.' })
  reason: string;
}
