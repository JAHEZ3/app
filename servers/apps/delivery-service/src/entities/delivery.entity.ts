import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum DeliveryStatus {
  ASSIGNED = 'assigned',
  HEADING_TO_RESTAURANT = 'heading_to_restaurant',
  PICKED_UP = 'picked_up',
  HEADING_TO_CUSTOMER = 'heading_to_customer',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @Index()
  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @Index()
  @Column({ type: 'enum', enum: DeliveryStatus, enumName: 'delivery_status', default: DeliveryStatus.ASSIGNED })
  status: DeliveryStatus;

  @Column({ name: 'pickup_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  pickupLat: number;

  @Column({ name: 'pickup_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  pickupLng: number;

  @Column({ name: 'dropoff_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  dropoffLat: number;

  @Column({ name: 'dropoff_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  dropoffLng: number;

  @Column({ name: 'distance_km', type: 'numeric', precision: 6, scale: 2, nullable: true })
  distanceKm: number;

  @Column({ name: 'agent_earnings', type: 'numeric', precision: 8, scale: 2, nullable: true })
  agentEarnings: number;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ name: 'picked_up_at', type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;
}
