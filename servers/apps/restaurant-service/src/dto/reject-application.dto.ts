import { IsOptional, IsString } from 'class-validator';

export class RejectApplicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
