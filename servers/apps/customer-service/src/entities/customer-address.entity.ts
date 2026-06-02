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

  // ─── New mobile fields (added so the address sheet can capture full ────
  // detail: building number, floor, and any delivery instructions). All
  // nullable so existing rows stay valid after the migration.
  @Column({ length: 80, nullable: true })
  building: string | null;

  @Column({ length: 40, nullable: true })
  floor: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
