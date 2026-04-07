import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-redis-yet';
import { RestaurantServiceController } from './restaurant-service.controller';
import { RestaurantServiceService } from './restaurant-service.service';
import { Restaurant } from './entities/restaurant.entity';
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
      Restaurant, RestaurantHour, RestaurantCategory, RestaurantCategoryMap,
      Menu, MenuSection, Meal, MealOptionGroup, MealOption,
    ]),
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
  controllers: [RestaurantServiceController],
  providers: [RestaurantServiceService],
})
export class RestaurantServiceModule {}
