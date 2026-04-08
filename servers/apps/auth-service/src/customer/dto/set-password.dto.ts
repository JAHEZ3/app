import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @MinLength(8)
  password: string;
}
