import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { EventPattern, Payload } from "@nestjs/microservices";
import {
  CustomerServiceService,
  CustomerCreatedPayload,
} from "./customer-service.service";
import { CompleteCustomerProfileDto } from "./dto/complete-profile.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (err: any, accept: boolean) => void,
  ) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new BadRequestException("Only image files are allowed"), false);
    }
    cb(null, true);
  },
};

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
   * Returns the authenticated customer's profile.
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser("sub") userId: string) {
    return this.service.getProfile(userId);
  }

  /**
   * POST /api/customer/profile
   * First-time profile completion — multipart/form-data.
   * Fields: firstName, lastName, locationLat, locationLng, [dateOfBirth]
   * File:   avatar (optional image, max 5 MB) — uploaded to S3 customer/ folder
   */
  @Post("profile")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "avatar", maxCount: 1 }], multerOptions),
  )
  completeProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: CompleteCustomerProfileDto,
    @UploadedFiles() files: { avatar?: Express.Multer.File[] },
  ) {
    return this.service.completeProfile(userId, dto, files?.avatar?.[0]);
  }

  /**
   * PATCH /api/customer/profile
   * Update profile fields — multipart/form-data.
   * All fields optional. Send avatar file to update profile picture.
   */
  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "avatar", maxCount: 1 }], multerOptions),
  )
  updateProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: Partial<CompleteCustomerProfileDto>,
    @UploadedFiles() files: { avatar?: Express.Multer.File[] },
  ) {
    return this.service.updateProfile(userId, dto, files?.avatar?.[0]);
  }
}
