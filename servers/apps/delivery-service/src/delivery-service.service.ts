import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AgentStatus } from './entities/delivery-company.entity';
import { AgentType, ApplicationAnswer, DeliveryAgent } from './entities/delivery-agent.entity';
import { ApplicationAnswerDto } from './dto/complete-profile.dto';

// ─── Application question pool (no DB — 2 random returned on each request) ────
const QUESTION_POOL = [
  'Why do you want to join our delivery team?',
  'Tell us about your previous work experience.',
  'What motivates you to work as a delivery agent?',
  'Describe a challenge you faced at work and how you handled it.',
  'What kind of work did you do before applying here?',
  'How do you handle pressure and tight deadlines?',
];

@Injectable()
export class DeliveryServiceService {
  private readonly logger = new Logger(DeliveryServiceService.name);

  constructor(
    @InjectRepository(DeliveryAgent)
    private readonly agentRepo: Repository<DeliveryAgent>,
  ) {}

  // ─── NATS: create agent skeleton on registration ──────────────────────────────

  async createAgent(data: {
    userId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string;
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
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth ?? null,
        phone: data.phone,
        agentType: data.agentType as AgentType,
        status: AgentStatus.PENDING_APPROVAL,
      }),
    );
    this.logger.log(`Delivery agent created for userId: ${data.userId} — awaiting profile completion`);
  }

  // ─── Profile step 2: get random questions ────────────────────────────────────

  getQuestions(): { question: string }[] {
    const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map((q) => ({ question: q }));
  }

  // ─── Profile step 2: complete profile + submit for review ────────────────────

  async completeProfile(
    userId: string,
    answers: ApplicationAnswerDto[],
    files: {
      profilePicture?: Express.Multer.File[];
      idPicture?: Express.Multer.File[];
    },
  ) {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) throw new NotFoundException('Delivery agent profile not found');
    if (agent.applicationSubmittedAt) {
      throw new BadRequestException('Application already submitted');
    }
    if (!files.profilePicture?.[0]) throw new BadRequestException('Profile picture is required');
    if (!files.idPicture?.[0]) throw new BadRequestException('ID picture is required');
    if (!answers?.length || answers.length !== 2) {
      throw new BadRequestException('Exactly 2 question answers are required');
    }

    const applicationAnswers: ApplicationAnswer[] = answers.map((a) => ({
      question: a.question,
      answer: a.answer,
    }));

    await this.agentRepo.update(agent.id, {
      profilePictureUrl: files.profilePicture[0].path,
      idPictureUrl: files.idPicture[0].path,
      applicationAnswers,
      applicationSubmittedAt: new Date(),
    });

    this.logger.log(`Agent ${userId} submitted application for review`);
    return {
      data: { agentId: agent.id },
      message: 'Application submitted. A manager will review it shortly.',
    };
  }

  // ─── Manager: view submitted applications ────────────────────────────────────

  async getPendingApplications() {
    const agents = await this.agentRepo.find({
      where: {
        status: AgentStatus.PENDING_APPROVAL,
        applicationSubmittedAt: Not(IsNull()),
      },
      order: { applicationSubmittedAt: 'ASC' },
    });

    return {
      data: agents.map((a) => ({
        agentId: a.id,
        userId: a.userId,
        fullName: a.fullName,
        phone: a.phone,
        agentType: a.agentType,
        dateOfBirth: a.dateOfBirth,
        profilePictureUrl: a.profilePictureUrl,
        idPictureUrl: a.idPictureUrl,
        applicationAnswers: a.applicationAnswers,
        submittedAt: a.applicationSubmittedAt,
      })),
      total: agents.length,
    };
  }

  // ─── NATS: activate agent after manager approves ──────────────────────────────

  async approveAgent(data: { userId: string }) {
    const agent = await this.agentRepo.findOne({ where: { userId: data.userId } });
    if (!agent) {
      this.logger.warn(`No agent found for userId: ${data.userId} on approval`);
      return;
    }
    await this.agentRepo.update(agent.id, { status: AgentStatus.ACTIVE });
    this.logger.log(`Delivery agent activated for userId: ${data.userId}`);
  }
}
