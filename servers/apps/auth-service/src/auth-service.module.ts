import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { redisStore } from 'cache-manager-redis-yet';
import { User } from './entities/user.entity';
<<<<<<< HEAD
import { AppJwtModule } from './jwt/jwt.module';
import { OtpService } from './otp/otp.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
=======
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpCode } from './entities/otp-code.entity';
import { CustomerAuthModule } from './customer/customer-auth.module';
import { RestaurantAuthModule } from './restaurant/restaurant-auth.module';
import { DeliveryAuthModule } from './delivery/delivery-auth.module';
import { TokenModule } from './token/token.module';
>>>>>>> 9a25fd6a14dd7d6993717c6a143c8ccc44d2c806

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'jahez_db'),
        entities: [User],
        synchronize: true,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([User]),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        }),
      }),
      inject: [ConfigService],
    }),
<<<<<<< HEAD

    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [config.get<string>('NATS_URL', 'nats://localhost:4222')],
          },
        }),
        inject: [ConfigService],
      },
    ]),

    AppJwtModule,
=======
    CustomerAuthModule,
    RestaurantAuthModule,
    DeliveryAuthModule,
    TokenModule,
>>>>>>> 9a25fd6a14dd7d6993717c6a143c8ccc44d2c806
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService],
})
export class AuthServiceModule {}
