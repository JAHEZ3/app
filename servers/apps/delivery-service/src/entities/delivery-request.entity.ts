import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { ApplicationAnswer } from './delivery-agent.entity';

export enum DeliveryRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('delivery_requests')
export class DeliveryRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string; // FK → delivery_agents.id

  // TODO: Replace local file paths with S3/Cloudflare R2 signed URLs.
  // Upload via @aws-sdk/client-s3 PutObjectCommand or the R2 S3-compatible API,
  // then store the returned public/presigned URL here instead of the local path.
  @Column({ name: 'profile_picture_url', type: 'text', nullable: true })
  profilePictureUrl: string;

  @Column({ name: 'id_picture_url', type: 'text', nullable: true })
  idPictureUrl: string;

  @Column({ name: 'answers', type: 'jsonb' })
  answers: ApplicationAnswer[];

  @Column({
    type: 'enum',
    enum: DeliveryRequestStatus,
    enumName: 'delivery_request_status',
    default: DeliveryRequestStatus.PENDING,
  })
  status: DeliveryRequestStatus;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string; // managerId from JWT

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;
}
