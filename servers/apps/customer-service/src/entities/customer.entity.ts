import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { CustomerAddress } from './customer-address.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ name: 'default_address_id', type: 'uuid', nullable: true })
  defaultAddressId: string;

  @Column({ name: 'wallet_balance', type: 'numeric', precision: 10, scale: 2, default: 0.00 })
  walletBalance: number;

  @OneToMany(() => CustomerAddress, (address) => address.customer)
  addresses: CustomerAddress[];
}
