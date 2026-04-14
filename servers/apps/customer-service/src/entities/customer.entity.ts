import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CustomerAddress } from './customer-address.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to auth-service User — source of truth for auth/identity
  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  // Profile fields — nullable so a stub can be created from the NATS event;
  // populated when the customer completes their profile via PATCH /api/customer/profile.
  @Column({ name: 'first_name', length: 80, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 80, nullable: true })
  lastName: string;

  @Column({ name: 'full_name', length: 160, nullable: true })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ name: 'location_lat', type: 'numeric', precision: 9, scale: 6, nullable: true })
  locationLat: number;

  @Column({ name: 'location_lng', type: 'numeric', precision: 9, scale: 6, nullable: true })
  locationLng: number;

  @Column({ name: 'profile_completed', default: false })
  profileCompleted: boolean;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ name: 'default_address_id', type: 'uuid', nullable: true })
  defaultAddressId: string;

  @Column({ name: 'wallet_balance', type: 'numeric', precision: 10, scale: 2, default: 0.0 })
  walletBalance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => CustomerAddress, (address) => address.customer)
  addresses: CustomerAddress[];
}
