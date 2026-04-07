import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('managers')
export class Manager {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ type: 'text', array: true, default: '{}' })
  permissions: string[];

  @Column({ name: 'is_super_admin', default: false })
  isSuperAdmin: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
