import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../entities/order-enums';

export class CheckoutDto {
  // Client-generated UUID. The server uses it to detect duplicate submissions
  // without requiring the client to know its own orderId in advance.
  // Passed via the Idempotency-Key header (extracted by the controller).
  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;

  @IsUUID()
  addressId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  // Snapshot of address passed from client (validated server-side)
  @IsOptional()
  addressSnapshot?: {
    street: string;
    city: string;
    lat: number;
    lng: number;
    label?: string;
  };

  // Snapshots of customer info for the receipt
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Restaurant ownerUserId — for WS room targeting
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  // Restaurant name snapshot
  @IsOptional()
  @IsString()
  restaurantName?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignDeliveryDto {
  @IsUUID()
  deliveryAgentId: string;
}

export class RateOrderDto {
  @IsNumber()
  @Min(1)
  foodRating: number;

  @IsNumber()
  @Min(1)
  deliveryRating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class OrderFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
