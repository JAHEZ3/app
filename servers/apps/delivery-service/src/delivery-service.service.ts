import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
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
    @Inject("NATS_SERVICE")
    private readonly natsClient: ClientProxy,
  ) {}

  // ─── Profile step 1: get random questions ────────────────────────────────────

  getQuestions(): { question: string }[] {
    const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map((q) => ({ question: q }));
  }

  // ─── Profile step 2: submit complete profile + application for review ─────────
  //
  // Also sets the agent's password via auth-service (NATS event) so they can
  // log in with phone + password after OTP verification.
  //

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
      this.logger.log(`Delivery agent record created for userId: ${userId}`);
    } else {
      // Update existing agent record on resubmission (after rejection)
      await this.agentRepo.update(agent.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        fullName: `${profileData.firstName} ${profileData.lastName}`,
        ...(profileData.dateOfBirth && { dateOfBirth: profileData.dateOfBirth }),
        agentType: profileData.agentType as AgentType,
        ...(profileData.vehicleType && { vehicleType: profileData.vehicleType as VehicleType }),
        ...(profileData.vehiclePlate && { vehiclePlate: profileData.vehiclePlate }),
        status: AgentStatus.PENDING_APPROVAL,
      });
    }

    // Prevent duplicate pending submissions
    const pending = await this.requestRepo.findOne({
      where: { agentId: agent.id, status: DeliveryRequestStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException("Application already submitted and is pending review");
    }

    const applicationAnswers: ApplicationAnswer[] = answers.map((a) => ({
      question: a.question,
      answer: a.answer,
    }));

    await this.requestRepo.save(
      this.requestRepo.create({
        agentId: agent.id,
        // TODO: Replace local path with S3/R2 URL after integrating object storage
        profilePictureUrl: files.profilePicture[0].path,
        idPictureUrl: files.idPicture[0].path,
        answers: applicationAnswers,
        submittedAt: new Date(),
      }),
    );

    // Set password on the auth-service user so agent can log in with phone+password
    if (profileData.password) {
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.hash(profileData.password, 10);
      this.natsClient.emit("user.password.set", { userId, passwordHash });
    }

    // Notify auth-service: profileCompleted = true
    this.natsClient.emit("delivery.profile.completed", { userId });

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
    const agents = agentIds.length ? await this.agentRepo.findByIds(agentIds) : [];
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
      await this.agentRepo.update(agent.id, { status: AgentStatus.ACTIVE, isDelivery: true });

      // Notify auth-service: user status → ACTIVE
      this.natsClient.emit("delivery.agent.approved", { userId: agent.userId, requestId });

      this.logger.log(`Application ${requestId} approved — agent ${agent.userId} activated`);
    }

    return { data: { requestId }, message: "Agent approved and activated." };
  }

  // ─── Manager: reject application ─────────────────────────────────────────────

  async rejectApplication(requestId: string, managerId: string, reason: string) {
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

    const agent = await this.agentRepo.findOne({ where: { id: req.agentId } });
    if (agent) {
      await this.agentRepo.update(agent.id, { status: AgentStatus.PENDING_APPROVAL });

      // Notify auth-service: profileCompleted reset so agent can resubmit
      this.natsClient.emit("delivery.agent.rejected", {
        userId: agent.userId,
        requestId,
        reason,
      });

      this.logger.log(`Application ${requestId} rejected — agent ${agent.userId} can resubmit`);
    }

    return { data: { requestId }, message: "Application rejected." };
  }
}
