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
import { Customer } from "./entities/customer.entity";
import { CompleteCustomerProfileDto } from "./dto/complete-profile.dto";
import { S3Service } from "./s3.service";

export interface CustomerCreatedPayload {
  userId: string;
  phone: string;
}

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @Inject("NATS_SERVICE")
    private readonly natsClient: ClientProxy,
    private readonly s3: S3Service,
  ) {}

  // ─── NATS: create minimal stub on user registration ───────────────────────────
  // Auth-service emits 'user.customer.created' with {userId, phone}.
  // We store a stub so the userId is reserved; the rest is filled via HTTP.

  async createProfileStub(data: CustomerCreatedPayload): Promise<void> {
    const existing = await this.customerRepo.findOne({
      where: { userId: data.userId },
    });
    if (existing) {
      this.logger.warn(
        `Customer stub already exists for userId: ${data.userId}`,
      );
      return;
    }

    await this.customerRepo.save(
      this.customerRepo.create({ userId: data.userId }),
    );

    this.logger.log(`Customer stub created for userId: ${data.userId}`);
  }

  // ─── HTTP: complete profile ───────────────────────────────────────────────────
  // Called by the customer after OTP verification (status = SUSPENDED).
  // On success: emits 'customer.profile.completed' → auth-service sets ACTIVE.

  async completeProfile(
    userId: string,
    dto: CompleteCustomerProfileDto,
    avatarFile?: Express.Multer.File,
  ) {
    let customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) {
      customer = await this.customerRepo.save(
        this.customerRepo.create({ userId }),
      );
    }

    if (customer.profileCompleted) {
      throw new BadRequestException("تم إكمال الملف الشخصي مسبقاً.");
    }

    const avatarUrl = avatarFile
      ? await this.s3.upload(avatarFile, "customer")
      : dto.avatarUrl;

    await this.customerRepo.update(customer.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      fullName: `${dto.firstName} ${dto.lastName}`,
      ...(dto.dateOfBirth && { dateOfBirth: dto.dateOfBirth }),
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      ...(avatarUrl && { avatarUrl }),
      profileCompleted: true,
    });

    // Notify auth-service: profileCompleted = true → user status → ACTIVE
    try {
      this.natsClient.emit("customer.profile.completed", { userId });
    } catch (err) {
      this.logger.error("NATS emit customer.profile.completed failed", err);
    }

    this.logger.log(`Customer ${userId} profile completed`);

    return {
      data: { userId },
      message: "تم إكمال الملف الشخصي. حسابك نشط الآن.",
    };
  }

  // ─── HTTP: update profile (after initial completion) ─────────────────────────

  async updateProfile(
    userId: string,
    dto: Partial<CompleteCustomerProfileDto>,
    avatarFile?: Express.Multer.File,
  ) {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException("الملف الشخصي للعميل غير موجود.");

    const updates: Partial<Customer> = {};
    if (dto.firstName) updates.firstName = dto.firstName;
    if (dto.lastName) updates.lastName = dto.lastName;
    if (dto.firstName || dto.lastName) {
      updates.fullName = `${dto.firstName ?? customer.firstName} ${dto.lastName ?? customer.lastName}`;
    }
    if (dto.dateOfBirth) updates.dateOfBirth = dto.dateOfBirth;
    if (dto.locationLat !== undefined) updates.locationLat = dto.locationLat;
    if (dto.locationLng !== undefined) updates.locationLng = dto.locationLng;
    if (avatarFile) {
      updates.avatarUrl = await this.s3.upload(avatarFile, "customer");
    } else if (dto.avatarUrl) {
      updates.avatarUrl = dto.avatarUrl;
    }

    await this.customerRepo.update(customer.id, updates);
    const updated = await this.customerRepo.findOne({ where: { userId } });
    return { data: updated, message: "تم تحديث الملف الشخصي." };
  }

  // ─── HTTP: get own profile ────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const customer = await this.customerRepo.findOne({
      where: { userId },
      relations: ["addresses"],
    });
    if (!customer) throw new NotFoundException("الملف الشخصي للعميل غير موجود.");
    return { data: customer, message: "تم استرجاع الملف الشخصي." };
  }
}
