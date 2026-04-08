import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveDeliveryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
