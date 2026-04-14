import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  CustomerServiceService,
  CustomerCreatedPayload,
} from "./customer-service.service";
import { CompleteCustomerProfileDto } from "./dto/complete-profile.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller()
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}

  // ─── NATS: reserve profile stub on registration ───────────────────────────────

  @EventPattern("user.customer.created")
  handleCustomerCreated(@Payload() data: CustomerCreatedPayload) {
    return this.service.createProfileStub(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP endpoints  —  require JWT (issued by auth-service after OTP verify)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/customer/profile
   * Returns the authenticated customer's profile including saved addresses.
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser("sub") userId: string) {
    return this.service.getProfile(userId);
  }

  /**
   * POST /api/customer/profile
   * First-time profile completion (SUSPENDED → triggers ACTIVE via auth-service NATS event).
   * Send: firstName, lastName, locationLat, locationLng, [dateOfBirth], [avatarUrl]
   */
  @Post("profile")
  @UseGuards(JwtAuthGuard)
  completeProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: CompleteCustomerProfileDto,
  ) {
    return this.service.completeProfile(userId, dto);
  }

  /**
   * PATCH /api/customer/profile
   * Update individual profile fields after the profile is already complete.
   * All fields are optional.
   */
  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: Partial<CompleteCustomerProfileDto>,
  ) {
    return this.service.updateProfile(userId, dto);
  }
}
