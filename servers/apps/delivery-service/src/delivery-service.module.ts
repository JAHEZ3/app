import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { DeliveryServiceController } from "./delivery-service.controller";
import { DeliveryServiceService } from "./delivery-service.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { DeliveryAgent } from "./entities/delivery-agent.entity";
import { DeliveryRequest } from "./entities/delivery-request.entity";
import { Delivery } from "./entities/delivery.entity";
import { DeliveryLocationLog } from "./entities/delivery-location-log.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 5432),
        username: config.get<string>("DB_USER", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "jahez_db"),
        autoLoadEntities: true,
        synchronize: config.get<string>("NODE_ENV") !== "production",
        logging: config.get<string>("NODE_ENV") === "development",
        extra: {
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      DeliveryAgent,
      DeliveryRequest,
      Delivery,
      DeliveryLocationLog,
    ]),
    // JwtModule with no default config — secret is read per-call in the guard
    JwtModule.register({}),

    // NATS client — emits domain events consumed by auth-service and others
    ClientsModule.registerAsync([
      {
        name: "NATS_SERVICE",
        useFactory: (config: ConfigService) => ({
          transport: Transport.NATS,
          options: { servers: [config.get<string>("NATS_URL", "nats://localhost:4222")] },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [DeliveryServiceController],
  providers: [DeliveryServiceService, JwtAuthGuard, RolesGuard],
})
export class DeliveryServiceModule {}
