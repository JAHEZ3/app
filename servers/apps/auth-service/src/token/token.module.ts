import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'jahez_jwt_secret_change_in_production',
        signOptions: { issuer: 'jahez-auth', audience: 'jahez-services' },
      }),
    }),
  ],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService, JwtModule],
})
export class TokenModule {}
