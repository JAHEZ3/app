import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryServiceController } from './delivery-service.controller';
import { DeliveryServiceService } from './delivery-service.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { DeliveryCompany } from './entities/delivery-company.entity';
import { DeliveryAgent } from './entities/delivery-agent.entity';
import { Delivery } from './entities/delivery.entity';
import { DeliveryLocationLog } from './entities/delivery-location-log.entity';

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
        entities: [],
        synchronize: true,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([DeliveryCompany, DeliveryAgent, Delivery, DeliveryLocationLog]),
    // JwtModule with no default config — secret is read per-call in the guard
    JwtModule.register({}),
  ],
  controllers: [DeliveryServiceController],
  providers: [DeliveryServiceService, JwtAuthGuard, RolesGuard],
})
export class DeliveryServiceModule {}
