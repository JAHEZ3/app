import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { redisStore } from 'cache-manager-redis-yet';
import { RestaurantServiceController } from './restaurant-service.controller';
import { RestaurantServiceService } from './restaurant-service.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantRequest } from './entities/restaurant-request.entity';
import { RestaurantHour } from './entities/restaurant-hour.entity';
import { RestaurantCategory } from './entities/restaurant-category.entity';
import { RestaurantCategoryMap } from './entities/restaurant-category-map.entity';
import { Menu } from './entities/menu.entity';
import { MenuSection } from './entities/menu-section.entity';
import { Meal } from './entities/meal.entity';
import { MealOptionGroup } from './entities/meal-option-group.entity';
import { MealOption } from './entities/meal-option.entity';

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
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forFeature([
      Restaurant, RestaurantRequest, RestaurantHour,
      RestaurantCategory, RestaurantCategoryMap,
      Menu, MenuSection, Meal, MealOptionGroup, MealOption,
    ]),

    // JWT — secret is read inside JwtAuthGuard per-request
    JwtModule.register({}),

    // NATS client — emits events to auth-service
    ClientsModule.registerAsync([
      {
        name: 'NATS_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: { servers: [config.get<string>('NATS_URL', 'nats://localhost:4222')] },
        }),
        inject: [ConfigService],
      },
    ]),

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
  ],
  controllers: [RestaurantServiceController],
  providers: [RestaurantServiceService, JwtAuthGuard, RolesGuard],
})
export class RestaurantServiceModule {}
