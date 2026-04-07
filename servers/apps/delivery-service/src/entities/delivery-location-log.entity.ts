import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('delivery_location_logs')
export class DeliveryLocationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId: string;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  lat: number;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  lng: number;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
