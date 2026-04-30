import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, OneToMany } from 'typeorm';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order-enums';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';

@Entity('orders')
@Index(['restaurantId', 'status'])
@Index(['customerId', 'status'])
// Prevents duplicate orders from the same customer using the same idempotency key
@Index(['customerId', 'idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', length: 20, unique: true })
  orderNumber: string;

  // Client-supplied UUID — enables safe retries without double-orders
  @Column({ name: 'idempotency_key', type: 'uuid', nullable: true })
  idempotencyKey: string | null;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Index()
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string;

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

  @Column({ name: 'restaurant_name_snapshot', length: 200, nullable: true })
  restaurantNameSnapshot: string;

  @Column({ name: 'customer_name_snapshot', length: 200, nullable: true })
  customerNameSnapshot: string;

  @Column({ name: 'customer_phone_snapshot', length: 50, nullable: true })
  customerPhoneSnapshot: string;

  @Index()
  @Column({ name: 'delivery_agent_id', type: 'uuid', nullable: true })
  deliveryAgentId: string;

  @Column({ name: 'receipt_key', type: 'text', nullable: true })
  receiptKey: string;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'delivery_fee', type: 'numeric', precision: 8, scale: 2, default: 0.00 })
  deliveryFee: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 8, scale: 2, default: 0.00 })
  discountAmount: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Index()
  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, enumName: 'payment_status', default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ name: 'promo_code_id', type: 'uuid', nullable: true })
  promoCodeId: string;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ name: 'estimated_delivery_at', type: 'timestamp', nullable: true })
  estimatedDeliveryAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (h) => h.orderId)
  statusHistory: OrderStatusHistory[];
}
