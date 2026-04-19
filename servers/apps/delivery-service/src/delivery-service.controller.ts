import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { DeliveryServiceService } from "./delivery-service.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { CompleteDeliveryProfileDto } from "./dto/complete-profile.dto";
import { RejectApplicationDto } from "./dto/review-application.dto";

const multerOptions = {
  storage: memoryStorage(), // files arrive as file.buffer — uploaded to S3 in the service
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
export class DeliveryServiceController {
  constructor(private readonly service: DeliveryServiceService) {}

  // ─── Profile: get random questions ───────────────────────────────────────────

  /**
   * GET /api/delivery/profile/questions
   * Public — returns 2 random questions for the application form.
   */
  @Get("profile/questions")
  getQuestions() {
    return { data: this.service.getQuestions() };
  }

  /**
   * GET /api/delivery/profile
   * Auth: Bearer token (delivery role)
   * Returns the agent's full profile + presigned photo URLs.
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser("sub") userId: string) {
    return this.service.getProfile(userId);
  }

  // ─── Profile: submit application (JWT required) ───────────────────────────────

  /**
   * POST /api/delivery/profile/complete
   * Auth: Bearer token (delivery role)
   * Multipart/form-data fields:
   *   firstName, lastName, dateOfBirth  — text
   *   vehicleType, vehiclePlate                    — text (optional)
   *   answers                                      — JSON string: [{ question, answer }, ...]
   *   profilePicture                               — image file
   *   idPicture                                    — image file
   */
  @Post("profile")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "profilePicture", maxCount: 1 },
        { name: "idPicture", maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  async completeProfile(
    @CurrentUser("sub") userId: string,
    @CurrentUser("phone") phone: string,
    @Body() dto: CompleteDeliveryProfileDto,
    @UploadedFiles()
    files: {
      profilePicture?: Express.Multer.File[];
      idPicture?: Express.Multer.File[];
    },
  ) {
    return this.service.completeProfile(userId, phone, dto, dto.answers, files);
  }

  // ─── Manager: view submitted applications ────────────────────────────────────

  /**
   * GET /api/delivery/manager/applications
   * Auth: Bearer token (manager role)
   */
  @Get("manager/applications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  getPendingApplications() {
    return this.service.getPendingApplications();
  }

  // ─── Manager: approve application ────────────────────────────────────────────

  /**
   * PATCH /api/delivery/manager/applications/:id/approve
   * Auth: Bearer token (manager role)
   */
  @Patch("manager/applications/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  approveApplication(
    @Param("id") requestId: string,
    @CurrentUser("sub") managerId: string,
  ) {
    return this.service.approveApplication(requestId, managerId);
  }

  // ─── Manager: reject application ─────────────────────────────────────────────

  /**
   * PATCH /api/delivery/manager/applications/:id/reject
   * Auth: Bearer token (manager role)
   */
  @Patch("manager/applications/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  rejectApplication(
    @Param("id") requestId: string,
    @CurrentUser("sub") managerId: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.service.rejectApplication(requestId, managerId, dto.reason);
  }
}
