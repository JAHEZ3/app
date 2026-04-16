import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { VehicleType } from "../entities/delivery-agent.entity";

export class ApplicationAnswerDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class CompleteDeliveryProfileDto {
  /** Set here for the first time — stored in auth-service via NATS 'user.password.set'. */
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  /** National ID number (text) — manager can search/log without manually reading the photo. */
  @IsString()
  @IsNotEmpty()
  nationalIdNumber: string;

  /** City / zone the agent will operate in. */
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  /** Vehicle registration / licence plate number. */
  @IsString()
  @IsNotEmpty()
  vehicleLicenseNumber: string;

  /** Emergency contact full name. */
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  /** Emergency contact phone number. */
  @IsMobilePhone()
  emergencyContactPhone: string;

  /** IBAN for payment — up to 34 characters (SA format is 24). */
  @IsString()
  @IsNotEmpty()
  iban: string;

  /**
   * Must be sent as true — agent confirms they accept the terms and policy.
   * In multipart/form-data this arrives as the string "true"; @Transform converts it.
   */
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  termsAccepted: boolean;

  /** JSON string — parsed and validated separately in the controller. */
  @IsString()
  @IsNotEmpty()
  answers: string;
}

// Parsed from the raw JSON "answers" field in multipart body
export class ParsedAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers: ApplicationAnswerDto[];
}
