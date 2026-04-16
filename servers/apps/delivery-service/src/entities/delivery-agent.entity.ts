import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AgentStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  OFFLINE = 'offline',
}

export enum VehicleType {
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  CAR = 'car',
  ON_FOOT = 'on_foot',
}

export interface ApplicationAnswer {
  question: string;
  answer: string;
}

@Entity('delivery_agents')
export class DeliveryAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ name: 'first_name', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', length: 80 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'id_number', length: 50, nullable: true })
  idNumber: string;

  // ─── Operational fields ────────────────────────────────────────────────────────

  // True once a delivery_request has been approved — quick flag for dispatcher queries
  @Column({ name: 'is_delivery', default: false })
  isDelivery: boolean;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType, enumName: 'vehicle_type', nullable: true })
  vehicleType: VehicleType;

  @Column({ name: 'vehicle_plate', length: 20, nullable: true })
  vehiclePlate: string;

  @Column({ name: 'vehicle_license_number', length: 50, nullable: true })
  vehicleLicenseNumber: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ name: 'emergency_contact_name', length: 150, nullable: true })
  emergencyContactName: string;

  @Column({ name: 'emergency_contact_phone', length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column({ length: 34, nullable: true })
  iban: string;

  @Column({ name: 'terms_accepted', default: false })
  termsAccepted: boolean;

  @Index()
  @Column({ type: 'enum', enum: AgentStatus, enumName: 'agent_status', default: AgentStatus.PENDING_APPROVAL })
  status: AgentStatus;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.00 })
  rating: number;

  @Column({ name: 'total_deliveries', default: 0 })
  totalDeliveries: number;

  @Column({ name: 'wallet_balance', type: 'numeric', precision: 10, scale: 2, default: 0.00 })
  walletBalance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
