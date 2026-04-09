import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { AgentStatus } from './delivery-company.entity';

export enum AgentType {
  FREELANCER = 'freelancer',
  COMPANY_EMPLOYEE = 'company_employee',
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

  @Index()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string;

  @Column({ name: 'agent_type', type: 'enum', enum: AgentType, enumName: 'agent_type' })
  agentType: AgentType;

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

  // ─── Profile completion (step 2 of registration) ──────────────────────────────

  @Column({ name: 'profile_picture_url', type: 'text', nullable: true })
  profilePictureUrl: string;

  @Column({ name: 'id_picture_url', type: 'text', nullable: true })
  idPictureUrl: string;

  // Answers to the 2 random application questions
  @Column({ name: 'application_answers', type: 'jsonb', nullable: true })
  applicationAnswers: ApplicationAnswer[];

  // Set when the agent submits their complete profile for manager review
  @Column({ name: 'application_submitted_at', type: 'timestamp', nullable: true })
  applicationSubmittedAt: Date;

  // ─── Operational fields ────────────────────────────────────────────────────────

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType, enumName: 'vehicle_type', nullable: true })
  vehicleType: VehicleType;

  @Column({ name: 'vehicle_plate', length: 20, nullable: true })
  vehiclePlate: string;

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
