import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CompanyContract {
  PARTNER_COMPANY = 'partner_company',
  IN_HOUSE = 'in_house',
}

export enum AgentStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  OFFLINE = 'offline',
}

@Entity('delivery_companies')
export class DeliveryCompany {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'contract_type', type: 'enum', enum: CompanyContract, enumName: 'company_contract' })
  contractType: CompanyContract;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ type: 'enum', enum: AgentStatus, enumName: 'agent_status', default: AgentStatus.ACTIVE })
  status: AgentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
