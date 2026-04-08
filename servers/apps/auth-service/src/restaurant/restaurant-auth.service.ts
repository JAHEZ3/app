import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { TokenService } from '../token/token.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginRestaurantDto } from './dto/login-restaurant.dto';

@Injectable()
export class RestaurantAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  /** Checking() → saveRestaurant() → sendPassword(). */
  async register(dto: RegisterRestaurantDto): Promise<{ message: string; generatedPassword: string }> {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already registered.');

    const phone = dto.telephones[0];
    const existingPhone = await this.userRepo.findOne({ where: { phone } });
    if (existingPhone) throw new ConflictException('Phone number already registered.');

    const generatedPassword = randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    const user = this.userRepo.create({
      email: dto.email,
      phone,
      fullName: dto.nameOfCEO,
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      passwordHash,
      deviceInfo: {
        restaurantName: dto.restaurantName,
        type: dto.type,
        city: dto.city,
        telephones: dto.telephones,
      },
    });
    await this.userRepo.save(user);

    return {
      message: 'Restaurant registered successfully. Password has been sent to your email.',
      generatedPassword,
    };
  }

  /** Login(phoneNo, password) → access + refresh tokens. */
  async login(
    dto: LoginRestaurantDto,
    meta?: { ipAddress?: string },
  ): Promise<{ accessToken: string; refreshToken: string; userId: string; role: string }> {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phoneNo, role: UserRole.RESTAURANT_OWNER },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active.');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const { accessToken, refreshToken } = await this.tokenService.issueTokens(
      user.id,
      user.role,
      { ipAddress: meta?.ipAddress },
    );

    return { accessToken, refreshToken, userId: user.id, role: user.role };
  }
}
