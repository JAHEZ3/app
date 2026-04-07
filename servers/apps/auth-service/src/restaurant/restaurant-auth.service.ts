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
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginRestaurantDto } from './dto/login-restaurant.dto';

@Injectable()
export class RestaurantAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Checking() → saveRestaurant() → sendPassword().
   * Diagram: Restaurant sends data → Server checks → saves → sends generated password.
   */
  async register(dto: RegisterRestaurantDto): Promise<{ message: string; generatedPassword: string }> {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Email already registered.');
    }

    // Use first telephone as the login phone
    const phone = dto.telephones[0];
    const existingPhone = await this.userRepo.findOne({ where: { phone } });
    if (existingPhone) {
      throw new ConflictException('Phone number already registered.');
    }

    // Generate a secure random password (simulate sendPassword())
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

    // In production: send generatedPassword via email/SMS
    return {
      message: 'Restaurant registered successfully. Password has been sent to your email.',
      generatedPassword, // Exposed here only for development/testing
    };
  }

  /**
   * Login(phoneNo, password) → Dashboard.
   */
  async login(dto: LoginRestaurantDto): Promise<{ userId: string; role: string }> {
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

    return { userId: user.id, role: user.role };
  }
}
