import { IsString, IsNotEmpty, IsEmail, IsArray, ArrayMinSize, MinLength } from 'class-validator';

export class RegisterRestaurantDto {
  @IsString()
  @IsNotEmpty()
  restaurantName: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  telephones: string[];

  @IsString()
  @IsNotEmpty()
  nameOfCEO: string;

  @IsEmail()
  email: string;
}
