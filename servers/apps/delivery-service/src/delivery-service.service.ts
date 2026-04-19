import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { S3Service } from "./s3.service";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
import {
  AgentStatus,
  ApplicationAnswer,
  DeliveryAgent,
  VehicleType,
} from "./entities/delivery-agent.entity";
import { parseAndValidatePaymentInfo } from "./common/payment-info";
import {
  DeliveryRequest,
  DeliveryRequestStatus,
} from "./entities/delivery-request.entity";
import {
  ApplicationAnswerDto,
  CompleteDeliveryProfileDto,
} from "./dto/complete-profile.dto";

// ─── Fixed application questions (returned as-is on every request) ────────────
const FIXED_QUESTIONS = [
  "Why do you want to join our delivery team?",
  "Do you have previous experience in delivery or a related field? If yes, describe it briefly.",
  "How do you handle difficult situations with customers or tight deadlines?",
] as const;

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
    private readonly s3: S3Service,
  ) {}

  // ─── Profile step 1: get random questions ────────────────────────────────────

  getQuestions(): { question: string }[] {
    return FIXED_QUESTIONS.map((q) => ({ question: q }));
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
    if (!files?.profilePicture?.[0])
      throw new BadRequestException("صورة الملف الشخصي مطلوبة.");
    if (!files?.idPicture?.[0])
      throw new BadRequestException("صورة الهوية مطلوبة.");
    if (!answers?.length || answers.length !== 3)
      throw new BadRequestException("يجب الإجابة على الأسئلة الثلاثة بالضبط.");

    // Create agent record on first submission; re-applications reuse existing record
    if (!profileData.termsAccepted) {
      throw new BadRequestException("يجب قبول الشروط والسياسة للمتابعة.");
    }

    let paymentInfo: ReturnType<typeof parseAndValidatePaymentInfo>;
    try {
      paymentInfo = parseAndValidatePaymentInfo(profileData.paymentInfo);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    let agent = await this.agentRepo.findOne({ where: { userId } });
    const isFirstSubmission = !agent;
    if (!agent) {
      agent = await this.agentRepo.save(
        this.agentRepo.create({
          userId,
          phone,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          fullName: `${profileData.firstName} ${profileData.lastName}`,
          dateOfBirth: profileData.dateOfBirth ?? null,
          idNumber: profileData.nationalIdNumber,
          city: profileData.city,
          vehicleType: profileData.vehicleType as VehicleType,
          vehicleLicenseNumber: profileData.vehicleLicenseNumber,
          emergencyContactName: profileData.emergencyContactName,
          emergencyContactPhone: profileData.emergencyContactPhone,
          paymentInfo,
          termsAccepted: true,
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
        idNumber: profileData.nationalIdNumber,
        city: profileData.city,
        vehicleType: profileData.vehicleType as VehicleType,
        vehicleLicenseNumber: profileData.vehicleLicenseNumber,
        emergencyContactName: profileData.emergencyContactName,
        emergencyContactPhone: profileData.emergencyContactPhone,
        paymentInfo,
        termsAccepted: true,
        status: AgentStatus.PENDING_APPROVAL,
      });
    }

    // Prevent duplicate pending submissions
    const pending = await this.requestRepo.findOne({
      where: { agentId: agent.id, status: DeliveryRequestStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException(
        "تم تقديم الطلب بالفعل وهو قيد المراجعة.",
      );
    }

    const applicationAnswers: ApplicationAnswer[] = answers.map((a) => ({
      question: a.question,
      answer: a.answer,
    }));

    let profilePictureKey: string;
    let idPictureKey: string;
    try {
      [profilePictureKey, idPictureKey] = await Promise.all([
        this.s3.upload(files.profilePicture[0], "delivery"),
        this.s3.upload(files.idPicture[0], "delivery"),
      ]);
    } catch (err) {
      this.logger.error("S3 upload failed during completeProfile", err);
      throw new BadRequestException("فشل رفع الملفات. يرجى المحاولة مجدداً.");
    }

    await this.requestRepo.save(
      this.requestRepo.create({
        agentId: agent.id,
        profilePictureUrl: profilePictureKey,
        idPictureUrl: idPictureKey,
        answers: applicationAnswers,
        submittedAt: new Date(),
      }),
    );

    // Auth-service hashes the password — only set it on the first submission
    if (isFirstSubmission && profileData.password) {
      try {
        this.natsClient.emit("user.password.set", { userId, password: profileData.password });
      } catch (err) {
        this.logger.error("NATS emit user.password.set failed", err);
      }
    }

    // Notify auth-service: profileCompleted = true
    try {
      this.natsClient.emit("delivery.profile.completed", { userId });
    } catch (err) {
      this.logger.error("NATS emit delivery.profile.completed failed", err);
    }

    this.logger.log(`Agent ${userId} submitted application for review`);
    return {
      data: { agentId: agent.id },
      message: "تم تقديم الطلب. سيراجعه أحد المديرين قريباً.",
    };
  }

  // ─── Agent: get own profile ───────────────────────────────────────────────────

  async getProfile(userId: string) {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) throw new NotFoundException("الملف الشخصي غير موجود.");

    // Latest request holds the photos (most recent submission)
    const request = await this.requestRepo.findOne({
      where: { agentId: agent.id },
      order: { submittedAt: 'DESC' },
    });

    const [profilePictureUrl, idPictureUrl] = await Promise.all([
      request?.profilePictureUrl ? this.s3.presignedUrl(request.profilePictureUrl) : null,
      request?.idPictureUrl ? this.s3.presignedUrl(request.idPictureUrl) : null,
    ]);

    return {
      data: {
        ...agent,
        profilePictureUrl,
        idPictureUrl,
        applicationStatus: request?.status ?? null,
        rejectionReason: request?.rejectionReason ?? null,
      },
      message: "تم استرجاع الملف الشخصي.",
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
      ? await this.agentRepo.findBy({ id: In(agentIds) })
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const presign = async (key: string | null | undefined) => {
      if (!key) return null;
      try { return await this.s3.presignedUrl(key); }
      catch (err) {
        this.logger.error(`Failed to presign key ${key}`, err);
        return null;
      }
    };

    const data = await Promise.all(
      requests.map(async (r) => {
        const agent = agentMap.get(r.agentId);
        const [profilePictureUrl, idPictureUrl] = await Promise.all([
          presign(r.profilePictureUrl),
          presign(r.idPictureUrl),
        ]);
        return {
          requestId: r.id,
          agentId: r.agentId,
          fullName: agent?.fullName ?? null,
          phone: agent?.phone ?? null,
          dateOfBirth: agent?.dateOfBirth ?? null,
          profilePictureUrl,
          idPictureUrl,
          answers: r.answers,
          submittedAt: r.submittedAt,
        };
      }),
    );

    return { data, total: requests.length };
  }

  // ─── Manager: approve application ────────────────────────────────────────────

  async approveApplication(requestId: string, managerId: string) {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException("الطلب غير موجود.");
    if (req.status !== DeliveryRequestStatus.PENDING)
      throw new BadRequestException("تمت مراجعة الطلب بالفعل.");

    await this.requestRepo.update(requestId, {
      status: DeliveryRequestStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: managerId,
    });

    const agent = await this.agentRepo.findOne({ where: { id: req.agentId } });
    if (!agent) throw new NotFoundException("بيانات المندوب غير موجودة.");

    await this.agentRepo.update(agent.id, {
      status: AgentStatus.ACTIVE,
      isDelivery: true,
    });

    // Notify auth-service: user status → ACTIVE
    try {
      this.natsClient.emit("delivery.agent.approved", { userId: agent.userId, requestId });
    } catch (err) {
      this.logger.error("NATS emit delivery.agent.approved failed", err);
    }

    this.logger.log(
      `Application ${requestId} approved — agent ${agent.userId} activated`,
    );

    return { data: { requestId }, message: "تمت الموافقة على المندوب وتفعيل حسابه." };
  }

  // ─── Manager: reject application ─────────────────────────────────────────────

  async rejectApplication(
    requestId: string,
    managerId: string,
    reason: string,
  ) {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException("الطلب غير موجود.");
    if (req.status !== DeliveryRequestStatus.PENDING)
      throw new BadRequestException("تمت مراجعة الطلب بالفعل.");

    await this.requestRepo.update(requestId, {
      status: DeliveryRequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedBy: managerId,
      rejectionReason: reason,
    });

    const agent = await this.agentRepo.findOne({ where: { id: req.agentId } });
    if (!agent) throw new NotFoundException("بيانات المندوب غير موجودة.");

    await this.agentRepo.update(agent.id, {
      status: AgentStatus.PENDING_APPROVAL,
    });

    // Notify auth-service: profileCompleted reset so agent can resubmit
    try {
      this.natsClient.emit("delivery.agent.rejected", { userId: agent.userId, requestId, reason });
    } catch (err) {
      this.logger.error("NATS emit delivery.agent.rejected failed", err);
    }

    this.logger.log(
      `Application ${requestId} rejected — agent ${agent.userId} can resubmit`,
    );

    return { data: { requestId }, message: "تم رفض الطلب." };
  }
}
