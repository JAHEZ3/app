import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, OneToMany } from 'typeorm';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order-enums';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';

@Entity('orders')
@Index(['restaurantId', 'status'])
@Index(['customerId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', length: 20, unique: true })
  orderNumber: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Index()
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @Column({ name: 'delivery_address_id', type: 'uuid' })
  deliveryAddressId: string;

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
