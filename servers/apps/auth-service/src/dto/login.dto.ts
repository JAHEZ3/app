import { IsEmail, IsEnum, IsMobilePhone, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class LoginDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
