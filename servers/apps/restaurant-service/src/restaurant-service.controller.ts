import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { EventPattern, Payload } from "@nestjs/microservices";
import { RestaurantServiceService } from "./restaurant-service.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { CompleteRestaurantProfileDto } from "./dto/complete-profile.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SetHoursDto } from "./dto/set-hours.dto";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { CreateMealDto } from "./dto/create-meal.dto";
import { UpdateMealDto } from "./dto/update-meal.dto";
import { CreateOptionGroupDto } from "./dto/create-option-group.dto";
import { UpdateOptionGroupDto } from "./dto/update-option-group.dto";
import { CreateOptionDto } from "./dto/create-option.dto";
import { UpdateOptionDto } from "./dto/update-option.dto";

const multerOptions = {
  storage: diskStorage({
    destination: "./uploads/restaurant",
    filename: (
      _req: any,
      file: Express.Multer.File,
      cb: (err: any, name: string) => void,
    ) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${unique}${extname(file.originalname)}`);
    },
  }),
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
export class RestaurantServiceController {
  constructor(private readonly service: RestaurantServiceService) {}

  // ─── NATS: create profile stub on registration ────────────────────────────────

  @EventPattern("user.restaurant.created")
  handleRestaurantCreated(@Payload() data: { userId: string; phone: string }) {
    return this.service.createProfileStub(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant?city=Riyadh */
  @Get()
  listRestaurants(@Query("city") city?: string) {
    return this.service.listPublicRestaurants(city);
  }

  /** GET /api/restaurant/:id — full menu tree */
  @Get(":id")
  getRestaurant(@Param("id") id: string) {
    return this.service.getPublicRestaurantWithMenu(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Restaurant owner — profile & settings
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/restaurant/profile
   * First-time profile completion (SUSPENDED → pending admin approval).
   * Multipart/form-data fields:
   *   restaurantName, ownerName, ownerNationalIdNumber, commercialRegNumber,
   *   restaurantPhone, password, lat, lng, deliveryRadiusKm, iban, termsAccepted  — text
   *   description, street, city, cuisineType                                       — text (optional)
   *   logo                                                                          — image file
   *   ownerIdPicture                                                                — image file
   */
  @Post("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "logo", maxCount: 1 },
        { name: "ownerIdPicture", maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  completeProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: CompleteRestaurantProfileDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      ownerIdPicture?: Express.Multer.File[];
    },
  ) {
    return this.service.completeProfile(userId, dto, files);
  }

  /** GET /api/restaurant/profile */
  @Get("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getProfile(@CurrentUser("sub") userId: string) {
    return this.service.getProfile(userId);
  }

  /** PATCH /api/restaurant/profile */
  @Patch("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateProfile(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.updateProfile(userId, dto);
  }

  /** POST /api/restaurant/settings */
  @Post("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateSettings(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.service.updateSettings(userId, dto);
  }

  /** PATCH /api/restaurant/toggle-open */
  @Patch("toggle-open")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  toggleOpen(@CurrentUser("sub") userId: string) {
    return this.service.toggleOpen(userId);
  }

  // ─── Operating Hours ──────────────────────────────────────────────────────

  /** GET /api/restaurant/hours */
  @Get("hours")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getHours(@CurrentUser("sub") userId: string) {
    return this.service.getHours(userId);
  }

  /** POST /api/restaurant/hours */
  @Post("hours")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  setHours(@CurrentUser("sub") userId: string, @Body() dto: SetHoursDto) {
    return this.service.setHours(userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Manager — application review
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant/manager/applications */
  @Get("manager/applications")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  getPendingApplications() {
    return this.service.getPendingApplications();
  }

  /** PATCH /api/restaurant/manager/applications/:id/approve */
  @Patch("manager/applications/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  approveApplication(
    @Param("id") requestId: string,
    @CurrentUser("sub") managerId: string,
  ) {
    return this.service.approveApplication(requestId, managerId);
  }

  /** PATCH /api/restaurant/manager/applications/:id/reject */
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Menus
  // ═══════════════════════════════════════════════════════════════════════════

  @Get("menus")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getMenus(@CurrentUser("sub") userId: string) {
    return this.service.getMenus(userId);
  }

  @Post("menus")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  createMenu(@CurrentUser("sub") userId: string, @Body() dto: CreateMenuDto) {
    return this.service.createMenu(userId, dto);
  }

  @Patch("menus/:menuId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateMenu(
    @CurrentUser("sub") userId: string,
    @Param("menuId") menuId: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.service.updateMenu(userId, menuId, dto);
  }

  @Delete("menus/:menuId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  deleteMenu(
    @CurrentUser("sub") userId: string,
    @Param("menuId") menuId: string,
  ) {
    return this.service.deleteMenu(userId, menuId);
  }

  // ─── Sections ─────────────────────────────────────────────────────────────

  @Get("menus/:menuId/sections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getSections(
    @CurrentUser("sub") userId: string,
    @Param("menuId") menuId: string,
  ) {
    return this.service.getSections(userId, menuId);
  }

  @Post("menus/:menuId/sections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  createSection(
    @CurrentUser("sub") userId: string,
    @Param("menuId") menuId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.service.createSection(userId, menuId, dto);
  }

  @Patch("sections/:sectionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateSection(
    @CurrentUser("sub") userId: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.service.updateSection(userId, sectionId, dto);
  }

  @Delete("sections/:sectionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  deleteSection(
    @CurrentUser("sub") userId: string,
    @Param("sectionId") sectionId: string,
  ) {
    return this.service.deleteSection(userId, sectionId);
  }

  // ─── Meals ────────────────────────────────────────────────────────────────

  @Get("sections/:sectionId/meals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getMeals(
    @CurrentUser("sub") userId: string,
    @Param("sectionId") sectionId: string,
  ) {
    return this.service.getMeals(userId, sectionId);
  }

  @Post("meals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  createMeal(@CurrentUser("sub") userId: string, @Body() dto: CreateMealDto) {
    return this.service.createMeal(userId, dto);
  }

  @Patch("meals/:mealId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateMeal(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
    @Body() dto: UpdateMealDto,
  ) {
    return this.service.updateMeal(userId, mealId, dto);
  }

  @Delete("meals/:mealId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  deleteMeal(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
  ) {
    return this.service.deleteMeal(userId, mealId);
  }

  @Patch("meals/:mealId/toggle-availability")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  toggleMealAvailability(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
  ) {
    return this.service.toggleMealAvailability(userId, mealId);
  }

  // ─── Option Groups ────────────────────────────────────────────────────────

  @Get("meals/:mealId/option-groups")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getOptionGroups(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
  ) {
    return this.service.getOptionGroups(userId, mealId);
  }

  @Post("meals/:mealId/option-groups")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  createOptionGroup(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.service.createOptionGroup(userId, mealId, dto);
  }

  @Patch("option-groups/:groupId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateOptionGroup(
    @CurrentUser("sub") userId: string,
    @Param("groupId") groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.service.updateOptionGroup(userId, groupId, dto);
  }

  @Delete("option-groups/:groupId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  deleteOptionGroup(
    @CurrentUser("sub") userId: string,
    @Param("groupId") groupId: string,
  ) {
    return this.service.deleteOptionGroup(userId, groupId);
  }

  // ─── Options ──────────────────────────────────────────────────────────────

  @Get("option-groups/:groupId/options")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getOptions(
    @CurrentUser("sub") userId: string,
    @Param("groupId") groupId: string,
  ) {
    return this.service.getOptions(userId, groupId);
  }

  @Post("option-groups/:groupId/options")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  createOption(
    @CurrentUser("sub") userId: string,
    @Param("groupId") groupId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.service.createOption(userId, groupId, dto);
  }

  @Patch("options/:optionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  updateOption(
    @CurrentUser("sub") userId: string,
    @Param("optionId") optionId: string,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.service.updateOption(userId, optionId, dto);
  }

  @Delete("options/:optionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  deleteOption(
    @CurrentUser("sub") userId: string,
    @Param("optionId") optionId: string,
  ) {
    return this.service.deleteOption(userId, optionId);
  }
}
