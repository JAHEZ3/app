import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum RestaurantStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Entity('restaurants')
@Index(['city', 'status', 'isOpen'])
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'cover_url', type: 'text', nullable: true })
  coverUrl: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'owner_name', length: 200, nullable: true })
  ownerName: string;

  @Column({ name: 'owner_national_id_number', length: 50, nullable: true })
  ownerNationalIdNumber: string;

  @Column({ name: 'commercial_reg_number', length: 50, nullable: true })
  commercialRegNumber: string;

  @Column({ name: 'cuisine_type', length: 100, nullable: true })
  cuisineType: string;

  @Column({ length: 34, nullable: true })
  iban: string;

  @Column({ name: 'terms_accepted', default: false })
  termsAccepted: boolean;

  @Column({ type: 'text', nullable: true })
  street: string;

  @Index()
  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: number;

  @Column({ name: 'min_order_amount', type: 'numeric', precision: 8, scale: 2, default: 0.00 })
  minOrderAmount: number;

  @Index()
  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.00 })
  rating: number;

  @Column({ name: 'total_ratings', default: 0 })
  totalRatings: number;

  @Index()
  @Column({ type: 'enum', enum: RestaurantStatus, enumName: 'restaurant_status', default: RestaurantStatus.PENDING_APPROVAL })
  status: RestaurantStatus;

  @Index()
  @Column({ name: 'is_open', default: false })
  isOpen: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
