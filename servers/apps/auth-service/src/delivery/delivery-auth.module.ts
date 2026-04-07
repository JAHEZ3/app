import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { OtpModule } from '../otp/otp.module';
import { DeliveryAuthService } from './delivery-auth.service';
import { DeliveryAuthController } from './delivery-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), OtpModule],
  controllers: [DeliveryAuthController],
  providers: [DeliveryAuthService],
})
export class DeliveryAuthModule {}
