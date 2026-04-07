import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ length: 50, nullable: true })
  label: string;

  @Column({ type: 'text' })
  street: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
