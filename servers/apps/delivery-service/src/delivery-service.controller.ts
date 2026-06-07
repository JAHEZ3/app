import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { DeliveryServiceService } from "./delivery-service.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { CompleteDeliveryProfileDto } from "./dto/complete-profile.dto";
import { RejectApplicationDto } from "./dto/review-application.dto";
import { AdminListAgentsDto } from "./dto/admin-list-agents.dto";
import { AdminUpdateAgentDto } from "./dto/admin-update-agent.dto";
import { AdminChangeAgentStatusDto } from "./dto/admin-change-agent-status.dto";

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
    // ParseUUIDPipe rejects malformed ids (e.g. the literal "undefined" the
    // dashboard would send when interpolating a missing param) with a clean
    // 400 instead of crashing TypeORM with `invalid input syntax for type uuid`.
    @Param("id", ParseUUIDPipe) requestId: string,
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
    @Param("id", ParseUUIDPipe) requestId: string,
    @CurrentUser("sub") managerId: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.service.rejectApplication(requestId, managerId, dto.reason);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANAGER DASHBOARD — Delivery Agent Administration
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/delivery/manager/agents?status=&vehicleType=&city=&search=&page=&limit= */
  @Get("manager/agents")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminListAgents(@Query() query: AdminListAgentsDto) {
    return this.service.adminListAgents(query);
  }

  /** GET /api/delivery/manager/agents/:id */
  @Get("manager/agents/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminGetAgent(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetAgent(id);
  }

  /** PATCH /api/delivery/manager/agents/:id */
  @Patch("manager/agents/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminUpdateAgent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateAgentDto,
  ) {
    return this.service.adminUpdateAgent(id, dto);
  }

  /** PATCH /api/delivery/manager/agents/:id/status */
  @Patch("manager/agents/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminChangeAgentStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminChangeAgentStatusDto,
  ) {
    return this.service.adminChangeAgentStatus(id, dto);
  }

  /** DELETE /api/delivery/manager/agents/:id */
  @Delete("manager/agents/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminDeleteAgent(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDeleteAgent(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE LOCATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/delivery/location
   * Auth: delivery role — persists a GPS log entry for the agent.
   * Real-time broadcasting is handled by the WebSocket gateway in api-gateway.
   */
  @Post("location")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("delivery")
  updateLocation(
    @CurrentUser("sub") userId: string,
    @Body() body: { lat: number; lng: number; orderId?: string },
  ) {
    return this.service.logLocation(userId, body.lat, body.lng);
  }

  /**
   * GET /api/delivery/location/:agentId
   * Returns current cached location for an agent (available to manager/restaurant_owner/customer).
   */
  @Get("location/:agentId")
  @UseGuards(JwtAuthGuard)
  getAgentLocation(@Param("agentId", ParseUUIDPipe) agentId: string) {
    return this.service.getLocation(agentId);
  }

  /**
   * GET /api/delivery/available
   * Returns all active/online delivery agents.
   * Available to manager and restaurant_owner.
   */
  @Get("available")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager", "restaurant_owner")
  listAvailableAgents() {
    return this.service.listAvailableAgents();
  }

  /**
   * GET /api/delivery/open?lat=…&lng=…&city=…
   *
   * Customer-facing list of agents who are truly "online right now". Filters
   * to active + isDelivery + a Redis location ping in the last 5 minutes —
   * agents who simply have the app installed but aren't on duty are excluded.
   *
   * Optional query params:
   *   • `lat`+`lng`  — customer's location. When both are present the results
   *                    are sorted by haversine distance and each row carries
   *                    `distanceKm`. Validated to be inside (-90,90)/(-180,180).
   *   • `city`       — case-sensitive city filter.
   *
   * Returns sanitized fields only (no phone / no full name) — phone is exposed
   * only after the agent is assigned to a specific order.
   */
  @Get("open")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("customer", "manager")
  listOpenAgents(
    @Query("lat") latRaw?: string,
    @Query("lng") lngRaw?: string,
    @Query("city") city?: string,
  ) {
    const lat = latRaw !== undefined ? Number(latRaw) : undefined;
    const lng = lngRaw !== undefined ? Number(lngRaw) : undefined;
    const valid =
      lat !== undefined &&
      lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;

    return this.service.listOpenAgents({
      customerLat: valid ? lat : undefined,
      customerLng: valid ? lng : undefined,
      city,
    });
  }

  // ─── NATS event: persist location log ────────────────────────────────────

  @EventPattern("delivery.location.updated")
  handleLocationUpdated(
    @Payload() data: { agentId: string; lat: number; lng: number; orderId?: string },
  ) {
    return this.service.logLocation(data.agentId, data.lat, data.lng);
  }
}
