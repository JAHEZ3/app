import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-redis-yet';
import { ManagerServiceController } from './manager-service.controller';
import { ManagerServiceService } from './manager-service.service';
import { AnalyticsService } from './analytics/analytics.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Manager } from './entities/manager.entity';
import { AuditLog } from './entities/audit-log.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { OrderRead } from './analytics/read-models/order.read';
import { RestaurantRead } from './analytics/read-models/restaurant.read';
import { CustomerRead } from './analytics/read-models/customer.read';
import { DeliveryRead } from './analytics/read-models/delivery.read';
import { DeliveryAgentRead } from './analytics/read-models/delivery-agent.read';
import { UserRead } from './analytics/read-models/user.read';
import { OrderTransactionRead } from './analytics/read-models/order-transaction.read';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'jahez_db',
      entities: [],
      synchronize: true,
      autoLoadEntities: true,
    }),

    TypeOrmModule.forFeature([
      Manager,
      AuditLog,
      PlatformSetting,
      OrderRead,
      RestaurantRead,
      CustomerRead,
      DeliveryRead,
      DeliveryAgentRead,
      UserRead,
      OrderTransactionRead,
    ]),

    JwtModule.register({}),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: +(process.env.REDIS_PORT || 6379),
          },
        }),
      }),
    }),
  ],
  controllers: [ManagerServiceController],
  providers: [ManagerServiceService, AnalyticsService, JwtAuthGuard, RolesGuard],
})
export class ManagerServiceModule {}
