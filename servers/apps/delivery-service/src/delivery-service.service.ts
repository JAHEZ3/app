import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentStatus } from './entities/delivery-company.entity';
import { AgentType, DeliveryAgent } from './entities/delivery-agent.entity';

@Injectable()
export class DeliveryServiceService {
  private readonly logger = new Logger(DeliveryServiceService.name);

  constructor(
    @InjectRepository(DeliveryAgent)
    private readonly agentRepo: Repository<DeliveryAgent>,
  ) {}

  async createAgent(data: {
    userId: string;
    fullName: string;
    phone: string;
    agentType: string;
    address: string | null;
  }) {
    const existing = await this.agentRepo.findOne({ where: { userId: data.userId } });
    if (existing) {
      this.logger.warn(`Delivery agent already exists for userId: ${data.userId}`);
      return;
    }
    await this.agentRepo.save(
      this.agentRepo.create({
        userId: data.userId,
        fullName: data.fullName,
        phone: data.phone,
        agentType: data.agentType as AgentType,
        status: AgentStatus.PENDING_APPROVAL,
      }),
    );
    this.logger.log(`Delivery agent created for userId: ${data.userId} — pending approval`);
  }
}
