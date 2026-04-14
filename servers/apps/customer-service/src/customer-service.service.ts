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
import { console } from "inspector";

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

  async completeProfile(userId: string, dto: CompleteCustomerProfileDto) {
    console.log("Completing profile for userId:", userId, "with data:", dto);

    let customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) {
      // Stub may not exist if NATS event was missed — create it now
      customer = await this.customerRepo.save(
        this.customerRepo.create({ userId }),
      );
    }

    if (customer.profileCompleted) {
      throw new BadRequestException(
        "Profile already completed. Use PATCH /profile to update it.",
      );
    }

    await this.customerRepo.update(customer.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      fullName: `${dto.firstName} ${dto.lastName}`,
      ...(dto.dateOfBirth && { dateOfBirth: dto.dateOfBirth }),
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
      profileCompleted: true,
    });

    // Notify auth-service: profileCompleted = true → user status → ACTIVE
    this.natsClient.emit("customer.profile.completed", { userId });

    this.logger.log(`Customer ${userId} profile completed`);

    return {
      data: { userId },
      message: "Profile completed. Your account is now active.",
    };
  }

  // ─── HTTP: update profile (after initial completion) ─────────────────────────

  async updateProfile(
    userId: string,
    dto: Partial<CompleteCustomerProfileDto>,
  ) {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException("Customer profile not found.");

    const updates: Partial<Customer> = {};
    if (dto.firstName) updates.firstName = dto.firstName;
    if (dto.lastName) updates.lastName = dto.lastName;
    if (dto.firstName || dto.lastName) {
      updates.fullName = `${dto.firstName ?? customer.firstName} ${dto.lastName ?? customer.lastName}`;
    }
    if (dto.dateOfBirth) updates.dateOfBirth = dto.dateOfBirth;
    if (dto.locationLat !== undefined) updates.locationLat = dto.locationLat;
    if (dto.locationLng !== undefined) updates.locationLng = dto.locationLng;
    if (dto.avatarUrl) updates.avatarUrl = dto.avatarUrl;

    await this.customerRepo.update(customer.id, updates);
    const updated = await this.customerRepo.findOne({ where: { userId } });
    return { data: updated, message: "Profile updated." };
  }

  // ─── HTTP: get own profile ────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const customer = await this.customerRepo.findOne({
      where: { userId },
      relations: ["addresses"],
    });
    if (!customer) throw new NotFoundException("Customer profile not found.");
    return { data: customer, message: "Profile retrieved." };
  }
}
