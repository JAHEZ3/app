import { ChildEntity, Column, Index } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus, OrderKind } from './order-enums';

/**
 * Online delivery order. Owns delivery-specific columns (address, fee, agent,
 * ETA, delivered timestamp) and the multi-step delivery status flow.
 */
@ChildEntity(OrderKind.ONLINE)
export class OnlineOrder extends Order {
  @Index()
  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'delivery_address_id', type: 'uuid', nullable: true })
  deliveryAddressId: string;

  @Column({ name: 'delivery_address_snapshot', type: 'jsonb', nullable: true })
  deliveryAddressSnapshot: {
    street: string;
    city: string;
    lat: number;
    lng: number;
    label?: string;
  };

  @Column({ name: 'delivery_fee', type: 'numeric', precision: 8, scale: 2, default: 0.00 })
  deliveryFee: number;

  @Index()
  @Column({ name: 'delivery_agent_id', type: 'uuid', nullable: true })
  deliveryAgentId: string;

  @Column({ name: 'estimated_delivery_at', type: 'timestamp', nullable: true })
  estimatedDeliveryAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // Set when status flips to PREPARING. A delayed BullMQ job auto-flips the
  // order to READY_FOR_PICKUP after ONLINE_PREPARING_AUTO_READY_MS so the
  // dashboard can render a 15-min countdown matching the timer.
  @Column({ name: 'preparing_started_at', type: 'timestamp', nullable: true })
  preparingStartedAt: Date | null;
}
