import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RestaurantAuthService } from './restaurant-auth.service';
import { RestaurantAuthController } from './restaurant-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [RestaurantAuthController],
  providers: [RestaurantAuthService],
})
export class RestaurantAuthModule {}
