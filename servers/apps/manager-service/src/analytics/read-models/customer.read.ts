import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'customers', synchronize: false })
export class CustomerRead {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'profile_completed' })
  profileCompleted: boolean;

  @Column({ name: 'wallet_balance', type: 'numeric', precision: 10, scale: 2 })
  walletBalance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
