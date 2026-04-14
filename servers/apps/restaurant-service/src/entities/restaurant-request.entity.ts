import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum RestaurantRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('restaurant_requests')
export class RestaurantRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string; // FK → restaurants.id

  @Column({
    type: 'enum',
    enum: RestaurantRequestStatus,
    enumName: 'restaurant_request_status',
    default: RestaurantRequestStatus.PENDING,
  })
  status: RestaurantRequestStatus;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string; // managerId from JWT

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;
}
