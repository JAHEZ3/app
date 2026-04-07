import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  CARD = 'card',
  ONLINE = 'online',
}

@Entity('order_transactions')
export class OrderTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId: string;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  type: PaymentMethod;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'balance_after', type: 'numeric', precision: 10, scale: 2 })
  balanceAfter: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
