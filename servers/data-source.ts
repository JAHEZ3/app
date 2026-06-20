import 'dotenv/config';
import { DataSource } from 'typeorm';

// Auth
import { User } from './apps/auth-service/src/entities/user.entity';
import { OtpCode } from './apps/auth-service/src/entities/otp-code.entity';
import { RefreshToken } from './apps/auth-service/src/entities/refresh-token.entity';

// Customer
import { Customer } from './apps/customer-service/src/entities/customer.entity';
import { CustomerAddress } from './apps/customer-service/src/entities/customer-address.entity';

// Restaurant
import { Restaurant } from './apps/restaurant-service/src/entities/restaurant.entity';
import { RestaurantRequest } from './apps/restaurant-service/src/entities/restaurant-request.entity';
import { RestaurantHour } from './apps/restaurant-service/src/entities/restaurant-hour.entity';
import { RestaurantCategory } from './apps/restaurant-service/src/entities/restaurant-category.entity';
import { RestaurantCategoryMap } from './apps/restaurant-service/src/entities/restaurant-category-map.entity';
import { Menu } from './apps/restaurant-service/src/entities/menu.entity';
import { MenuSection } from './apps/restaurant-service/src/entities/menu-section.entity';
import { Meal } from './apps/restaurant-service/src/entities/meal.entity';
import { MealOptionGroup } from './apps/restaurant-service/src/entities/meal-option-group.entity';
import { MealOption } from './apps/restaurant-service/src/entities/meal-option.entity';

// Order
import { PromoCode } from './apps/order-service/src/entities/promo-code.entity';
import { Order } from './apps/order-service/src/entities/order.entity';
import { OrderItem } from './apps/order-service/src/entities/order-item.entity';
import { OrderItemOption } from './apps/order-service/src/entities/order-item-option.entity';
import { OrderStatusHistory } from './apps/order-service/src/entities/order-status-history.entity';
import { OrderRating } from './apps/order-service/src/entities/order-rating.entity';

// Delivery
import { DeliveryCompany } from './apps/delivery-service/src/entities/delivery-company.entity';
import { DeliveryAgent } from './apps/delivery-service/src/entities/delivery-agent.entity';
import { DeliveryRequest } from './apps/delivery-service/src/entities/delivery-request.entity';
import { Delivery } from './apps/delivery-service/src/entities/delivery.entity';
import { DeliveryLocationLog } from './apps/delivery-service/src/entities/delivery-location-log.entity';

// Manager
import { Manager } from './apps/manager-service/src/entities/manager.entity';
import { AuditLog } from './apps/manager-service/src/entities/audit-log.entity';
import { GeneralSettings } from './apps/manager-service/src/entities/general-settings.entity';
import { FeesSettings } from './apps/manager-service/src/entities/fees-settings.entity';
import { DeliverySettings } from './apps/manager-service/src/entities/delivery-settings.entity';
import { NotificationSettings } from './apps/manager-service/src/entities/notification-settings.entity';
import { SystemSettings } from './apps/manager-service/src/entities/system-settings.entity';
import { PaymentSettings } from './apps/manager-service/src/entities/payment-settings.entity';

// Notification
import { Notification } from './apps/notification-service/src/entities/notification.entity';

// Payment
import { OrderTransaction } from './apps/payment-service/src/entities/order-transaction.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5433),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'jahez_db',
  synchronize: false,
  logging: true,
  entities: [
    User, OtpCode, RefreshToken,
    Customer, CustomerAddress,
    Restaurant, RestaurantRequest, RestaurantHour, RestaurantCategory, RestaurantCategoryMap,
    Menu, MenuSection, Meal, MealOptionGroup, MealOption,
    PromoCode, Order, OrderItem, OrderItemOption, OrderStatusHistory, OrderRating,
    DeliveryCompany, DeliveryAgent, DeliveryRequest, Delivery, DeliveryLocationLog,
    Manager, AuditLog,
    GeneralSettings, FeesSettings, DeliverySettings, NotificationSettings, SystemSettings, PaymentSettings,
    Notification,
    OrderTransaction,
  ],
  migrations: ['./migrations/*.ts'],
});

export default AppDataSource;
