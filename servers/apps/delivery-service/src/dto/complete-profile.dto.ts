import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AgentType, VehicleType } from '../entities/delivery-agent.entity';

export class ApplicationAnswerDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CompleteDeliveryProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(AgentType)
  agentType: AgentType;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}

// Parsed from the raw JSON "answers" field in multipart body
export class ParsedAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers: ApplicationAnswerDto[];
}
