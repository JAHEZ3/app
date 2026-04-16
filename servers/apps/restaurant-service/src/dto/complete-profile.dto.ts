import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";

/**
 * First-time restaurant profile completion.
 * Sent as multipart/form-data (logo + ownerIdPicture are file fields).
 * Sets the owner's password and creates the approval request.
 */
export class CompleteRestaurantProfileDto {
  /** Password — set here for the first time, forwarded to auth-service via NATS. */
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  restaurantName: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  /** Owner's national ID number (text) — for identity verification. */
  @IsString()
  @IsNotEmpty()
  ownerNationalIdNumber: string;

  /** Saudi commercial registration number (CR). */
  @IsString()
  @IsNotEmpty()
  commercialRegNumber: string;

  /** Public-facing restaurant contact phone (may differ from auth phone). */
  @IsString()
  @IsNotEmpty()
  restaurantPhone: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  cuisineType?: string;

  /** GPS latitude — required for map verification and order distance calculation. */
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  /** GPS longitude. */
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  /** IBAN for receiving order payouts — up to 34 characters (SA format is 24). */
  @IsString()
  @IsNotEmpty()
  iban: string;

  /**
   * Must be sent as true — owner confirms they accept the terms and policy.
   * In multipart/form-data this arrives as the string "true"; @Transform converts it.
   */
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  termsAccepted: boolean;
}
