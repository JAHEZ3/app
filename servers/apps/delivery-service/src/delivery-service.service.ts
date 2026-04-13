import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AgentStatus,
  AgentType,
  ApplicationAnswer,
  DeliveryAgent,
  VehicleType,
} from "./entities/delivery-agent.entity";
import {
  DeliveryRequest,
  DeliveryRequestStatus,
} from "./entities/delivery-request.entity";
import {
  ApplicationAnswerDto,
  CompleteDeliveryProfileDto,
} from "./dto/complete-profile.dto";

// ─── Application question pool (no DB — 2 random returned on each request) ────
const QUESTION_POOL = [
  "Why do you want to join our delivery team?",
  "Tell us about your previous work experience.",
  "What motivates you to work as a delivery agent?",
  "Describe a challenge you faced at work and how you handled it.",
  "What kind of work did you do before applying here?",
  "How do you handle pressure and tight deadlines?",
];

@Injectable()
export class DeliveryServiceService {
  private readonly logger = new Logger(DeliveryServiceService.name);

  constructor(
    @InjectRepository(DeliveryAgent)
    private readonly agentRepo: Repository<DeliveryAgent>,
    @InjectRepository(DeliveryRequest)
    private readonly requestRepo: Repository<DeliveryRequest>,
  ) {}

  // ─── Profile step 1: get random questions ────────────────────────────────────

  getQuestions(): { question: string }[] {
    const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map((q) => ({ question: q }));
  }

  // ─── Profile step 2: submit application for review ───────────────────────────
  // Creates the DeliveryAgent on first call, then creates a DeliveryRequest.

  async completeProfile(
    userId: string,
    phone: string,
    profileData: CompleteDeliveryProfileDto,
    answers: ApplicationAnswerDto[],
    files: {
      profilePicture?: Express.Multer.File[];
      idPicture?: Express.Multer.File[];
    },
  ) {
    if (!files.profilePicture?.[0])
      throw new BadRequestException("Profile picture is required");
    if (!files.idPicture?.[0])
      throw new BadRequestException("ID picture is required");
    if (!answers?.length || answers.length !== 2)
      throw new BadRequestException("Exactly 2 question answers are required");

    // Create agent record on first submission; re-applications reuse existing record
    let agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      agent = await this.agentRepo.save(
        this.agentRepo.create({
          userId,
          phone,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          fullName: `${profileData.firstName} ${profileData.lastName}`,
          dateOfBirth: profileData.dateOfBirth ?? null,
          agentType: profileData.agentType as AgentType,
          vehicleType: (profileData.vehicleType as VehicleType) ?? null,
          vehiclePlate: profileData.vehiclePlate ?? null,
          status: AgentStatus.PENDING_APPROVAL,
        }),
      );
      this.logger.log(`Delivery agent created for userId: ${userId}`);
    }

    // Prevent duplicate pending submissions
    const pending = await this.requestRepo.findOne({
      where: { agentId: agent.id, status: DeliveryRequestStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(
        "Application already submitted and is pending review",
      );
    }

    const applicationAnswers: ApplicationAnswer[] = answers.map((a) => ({
      question: a.question,
      answer: a.answer,
    }));

    await this.requestRepo.save(
      this.requestRepo.create({
        agentId: agent.id,
        // TODO: S3/R2 upload — replace .path with the cloud storage URL
        profilePictureUrl: files.profilePicture[0].path,
        idPictureUrl: files.idPicture[0].path,
        answers: applicationAnswers,
        submittedAt: new Date(),
      }),
    );

    this.logger.log(`Agent ${userId} submitted application for review`);
    return {
      data: { agentId: agent.id },
      message: "Application submitted. A manager will review it shortly.",
    };
  }

  // ─── Manager: view submitted applications ────────────────────────────────────

  async getPendingApplications() {
    const requests = await this.requestRepo.find({
      where: { status: DeliveryRequestStatus.PENDING },
      order: { submittedAt: "ASC" },
    });

    const agentIds = [...new Set(requests.map((r) => r.agentId))];
    const agents = agentIds.length
      ? await this.agentRepo.findByIds(agentIds)
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return {
      data: requests.map((r) => {
        const agent = agentMap.get(r.agentId);
        return {
          requestId: r.id,
          agentId: r.agentId,
          fullName: agent?.fullName ?? null,
          phone: agent?.phone ?? null,
          agentType: agent?.agentType ?? null,
          dateOfBirth: agent?.dateOfBirth ?? null,
          profilePictureUrl: r.profilePictureUrl,
          idPictureUrl: r.idPictureUrl,
          answers: r.answers,
          submittedAt: r.submittedAt,
        };
      }),
      total: requests.length,
    };
  }

  // ─── Manager: approve application ────────────────────────────────────────────

  async approveApplication(requestId: string, managerId: string) {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException("Application not found");
    if (req.status !== DeliveryRequestStatus.PENDING)
      throw new BadRequestException("Application has already been reviewed");

    await this.requestRepo.update(requestId, {
      status: DeliveryRequestStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: managerId,
    });

    const agent = await this.agentRepo.findOne({ where: { id: req.agentId } });
    if (agent) {
      await this.agentRepo.update(agent.id, {
        status: AgentStatus.ACTIVE,
        isDelivery: true,
      });
      this.logger.log(
        `Application ${requestId} approved — agent ${agent.userId} activated`,
      );
    }

    return { data: { requestId }, message: "Agent approved and activated." };
  }

  // ─── Manager: reject application ─────────────────────────────────────────────

  async rejectApplication(
    requestId: string,
    managerId: string,
    reason: string,
  ) {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException("Application not found");
    if (req.status !== DeliveryRequestStatus.PENDING)
      throw new BadRequestException("Application has already been reviewed");

    await this.requestRepo.update(requestId, {
      status: DeliveryRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedBy: managerId,
      rejectionReason: reason,
    });

    this.logger.log(`Application ${requestId} rejected — reason: ${reason}`);
    return { data: { requestId }, message: "Application rejected." };
  }
}
