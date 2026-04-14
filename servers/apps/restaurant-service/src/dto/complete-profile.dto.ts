import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * First-time restaurant profile completion.
 * Sets the owner's password (stored in auth-service via NATS) and creates
 * the restaurant record, triggering an admin approval request.
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

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  cuisineType?: string;
}
