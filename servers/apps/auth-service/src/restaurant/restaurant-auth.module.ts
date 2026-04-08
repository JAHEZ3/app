import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { TokenModule } from '../token/token.module';
import { RestaurantAuthService } from './restaurant-auth.service';
import { RestaurantAuthController } from './restaurant-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), TokenModule],
  controllers: [RestaurantAuthController],
  providers: [RestaurantAuthService],
})
export class RestaurantAuthModule {}
