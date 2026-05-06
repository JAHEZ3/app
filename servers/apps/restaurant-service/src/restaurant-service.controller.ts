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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { EventPattern, Payload } from "@nestjs/microservices";
import { RestaurantServiceService } from "./restaurant-service.service";
import { AiMenuImportService } from "./ai-menu-import.service";
import { AiCoverImageService } from "./ai-cover-image.service";
import { GenerateCoverDto } from "./dto/generate-cover.dto";
import { RestaurantAnalyticsService } from "./analytics/analytics.service";
import { CategoriesService } from "./categories/categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ApplyMenuImportDto } from "./dto/ai-menu-import.dto";
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
import { AdminListRestaurantsDto } from "./dto/admin-list-restaurants.dto";
import { AdminChangeRestaurantStatusDto } from "./dto/admin-change-restaurant-status.dto";
import { ReorderDto } from "./dto/reorder.dto";
import { AnalyticsReportDto, ReportPeriod } from "./dto/analytics-report.dto";
import { ListRestaurantsDto } from "./dto/list-restaurants.dto";
import { MobileListRestaurantsDto } from "./dto/mobile-list-restaurants.dto";
import { ListReviewsDto } from "./dto/list-reviews.dto";

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
export class RestaurantServiceController {
  constructor(
    private readonly service: RestaurantServiceService,
    private readonly aiMenuImport: AiMenuImportService,
    private readonly aiCoverImage: AiCoverImageService,
    private readonly analytics: RestaurantAnalyticsService,
    private readonly categories: CategoriesService,
  ) {}

  // ─── NATS: create profile stub on registration ────────────────────────────────

  @EventPattern("user.restaurant.created")
  handleRestaurantCreated(@Payload() data: { userId: string; phone: string }) {
    return this.service.createProfileStub(data);
  }

  // ─── NATS: order.rated → update cached restaurant rating ──────────────────────
  @EventPattern("order.rated")
  handleOrderRated(
    @Payload()
    data: {
      orderId: string;
      restaurantId: string;
      foodRating: number;
      deliveryRating: number;
    },
  ) {
    return this.service.applyRating(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant?city=Riyadh&page=1&limit=10 */
  @Get()
  listRestaurants(@Query() query: ListRestaurantsDto) {
    return this.service.listPublicRestaurants({
      city: query.city,
      page: query.page,
      limit: query.limit,
    });
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
    @CurrentUser("phone") phone: string,
    @Body() dto: CompleteRestaurantProfileDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      ownerIdPicture?: Express.Multer.File[];
    },
  ) {
    return this.service.completeProfile(userId, phone, dto, files);
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

  /** PATCH /api/restaurant/settings */
  @Patch("settings")
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

  /** PATCH /api/restaurant/menus/reorder — body: { items: [{id, displayOrder}] } */
  @Patch("menus/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  reorderMenus(@CurrentUser("sub") userId: string, @Body() dto: ReorderDto) {
    return this.service.reorderMenus(userId, dto);
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

  /** PATCH /api/restaurant/menus/:menuId/sections/reorder */
  @Patch("menus/:menuId/sections/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  reorderSections(
    @CurrentUser("sub") userId: string,
    @Param("menuId") menuId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderSections(userId, menuId, dto);
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

  /**
   * POST /api/restaurant/meals
   * Multipart/form-data. Text fields from CreateMealDto + optional `image` file.
   */
  @Post("meals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], multerOptions),
  )
  createMeal(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateMealDto,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    return this.service.createMeal(userId, dto, files?.image?.[0]);
  }

  /** PATCH /api/restaurant/sections/:sectionId/meals/reorder */
  @Patch("sections/:sectionId/meals/reorder")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  reorderMeals(
    @CurrentUser("sub") userId: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorderMeals(userId, sectionId, dto);
  }

  /**
   * PATCH /api/restaurant/meals/:mealId
   * Multipart/form-data. Any UpdateMealDto field + optional `image` file.
   */
  @Patch("meals/:mealId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], multerOptions),
  )
  updateMeal(
    @CurrentUser("sub") userId: string,
    @Param("mealId") mealId: string,
    @Body() dto: UpdateMealDto,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    return this.service.updateMeal(userId, mealId, dto, files?.image?.[0]);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MANAGER DASHBOARD — Restaurant Administration
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant/manager/restaurants?status=&cuisineType=&city=&search=&page=&limit= */
  @Get("manager/restaurants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminListRestaurants(@Query() query: AdminListRestaurantsDto) {
    return this.service.adminListRestaurants(query);
  }

  /** GET /api/restaurant/manager/restaurants/:id */
  @Get("manager/restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminGetRestaurant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetRestaurant(id);
  }

  /**
   * GET /api/restaurant/manager/restaurants/:id/full
   * Returns the restaurant profile + hours + full menu tree
   * (menus → sections → meals → option groups → options).
   */
  @Get("manager/restaurants/:id/full")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminGetRestaurantFull(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetRestaurantFull(id);
  }

  /**
   * POST /api/restaurant/manager/restaurants/:id/cover/ai
   * Generates a branded cover image via AI using the restaurant's name,
   * description, cuisine, and an accent color sampled from the logo
   * (or provided in the body). Saves the result and returns the new URL.
   */
  @Post("manager/restaurants/:id/cover/ai")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  async adminGenerateCover(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GenerateCoverDto,
  ) {
    const result = await this.aiCoverImage.generateCover(id, dto.accentColor);
    return { data: result, message: "تم توليد صورة الغلاف." };
  }

  /**
   * GET /api/restaurant/manager/restaurants/:id/reviews?page=1&limit=20
   * Paginated reviews + summary for any restaurant (manager view).
   */
  @Get("manager/restaurants/:id/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminListRestaurantReviews(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.analytics.listReviews(id, query.page, query.limit);
  }

  /** PATCH /api/restaurant/manager/restaurants/:id */
  @Patch("manager/restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminUpdateRestaurant(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.adminUpdateRestaurant(id, dto);
  }

  /** PATCH /api/restaurant/manager/restaurants/:id/status */
  @Patch("manager/restaurants/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminChangeRestaurantStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdminChangeRestaurantStatusDto,
  ) {
    return this.service.adminChangeRestaurantStatus(id, dto);
  }

  /** DELETE /api/restaurant/manager/restaurants/:id */
  @Delete("manager/restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  adminDeleteRestaurant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDeleteRestaurant(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Analytics — owner dashboard (scoped to the owner's restaurant)
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant/analytics — top-level dashboard overview */
  @Get("analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsOverview(@CurrentUser("sub") userId: string) {
    return this.analytics.getOverview(userId);
  }

  /**
   * GET /api/restaurant/analytics/report?period=daily|weekly|monthly
   * Statistics & Reports — performance for the selected period with growth vs. previous period.
   */
  @Get("analytics/report")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsReport(
    @CurrentUser("sub") userId: string,
    @Query() query: AnalyticsReportDto,
  ) {
    return this.analytics.getPerformanceReport(userId, query.period ?? ReportPeriod.DAILY);
  }

  /** GET /api/restaurant/analytics/orders */
  @Get("analytics/orders")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsOrders(@CurrentUser("sub") userId: string) {
    return this.analytics.getOrdersAnalytics(userId);
  }

  /** GET /api/restaurant/analytics/revenue */
  @Get("analytics/revenue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsRevenue(@CurrentUser("sub") userId: string) {
    return this.analytics.getRevenueAnalytics(userId);
  }

  /** GET /api/restaurant/analytics/top-meals */
  @Get("analytics/top-meals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsTopMeals(@CurrentUser("sub") userId: string) {
    return this.analytics.getTopMealsAnalytics(userId);
  }

  /** GET /api/restaurant/analytics/customers */
  @Get("analytics/customers")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsCustomers(@CurrentUser("sub") userId: string) {
    return this.analytics.getCustomersAnalytics(userId);
  }

  /** GET /api/restaurant/analytics/ratings */
  @Get("analytics/ratings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsRatings(@CurrentUser("sub") userId: string) {
    return this.analytics.getRatingsAnalytics(userId);
  }

  /**
   * GET /api/restaurant/analytics/reviews?page=1&limit=20
   * Paginated list of customer reviews for the owner's restaurant,
   * plus summary totals + distribution.
   */
  @Get("analytics/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsReviews(
    @CurrentUser("sub") userId: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.analytics.listOwnerReviews(userId, query.page, query.limit);
  }

  /** GET /api/restaurant/analytics/delivery */
  @Get("analytics/delivery")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsDelivery(@CurrentUser("sub") userId: string) {
    return this.analytics.getDeliveryAnalytics(userId);
  }

  /** GET /api/restaurant/analytics/payments */
  @Get("analytics/payments")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  getAnalyticsPayments(@CurrentUser("sub") userId: string) {
    return this.analytics.getPaymentsAnalytics(userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI — Smart Menu Import
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/restaurant/ai/menu-import/analyze
   * Multipart/form-data. Field: `image` (required).
   * Returns the structured JSON extracted from the image — does NOT persist.
   */
  @Post("ai/menu-import/analyze")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async analyzeMenuImage(@UploadedFile() image: Express.Multer.File) {
    const { extraction } = await this.aiMenuImport.analyzeMenu(image);
    return { data: extraction, message: "تم تحليل القائمة بنجاح." };
  }

  /**
   * POST /api/restaurant/ai/menu-import/apply
   * Persists an (optionally edited) extraction into the owner's restaurant.
   */
  @Post("ai/menu-import/apply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("restaurant_owner")
  async applyMenuImport(
    @CurrentUser("sub") userId: string,
    @Body() dto: ApplyMenuImportDto,
  ) {
    const result = await this.aiMenuImport.applyMenuImport(userId, dto);
    return { data: result, message: "تم استيراد القائمة بنجاح." };
  }

  /** GET /api/restaurant/by-name/:name — public full menu tree, looked up by name */
  @Get("by-name/:name")
  getRestaurantByName(@Param("name") name: string) {
    return this.service.getPublicRestaurantByName(name);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES — public list, manager-only CUD
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /api/restaurant/categories — public list (mobile, dashboards) */
  @Get("categories")
  listCategories() {
    return this.categories.list();
  }

  /** POST /api/restaurant/manager/categories */
  @Post("manager/categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  /** PATCH /api/restaurant/manager/categories/:id */
  @Patch("manager/categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  updateCategory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto);
  }

  /** DELETE /api/restaurant/manager/categories/:id */
  @Delete("manager/categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("manager")
  deleteCategory(@Param("id", ParseUUIDPipe) id: string) {
    return this.categories.delete(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE — customer app endpoints (lightweight, paginated, public)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/restaurant/mobile/restaurants
   *   Query: ?page=1&limit=10&city=Riyadh&search=...&cuisineType=pizza
   *   Returns a lightweight, paginated list of active restaurants (open first, then by rating).
   */
  @Get("mobile/restaurants")
  mobileListRestaurants(@Query() query: MobileListRestaurantsDto) {
    return this.service.mobileListRestaurants({
      city: query.city,
      search: query.search,
      cuisineType: query.cuisineType,
      page: query.page,
      limit: query.limit,
    });
  }

  /** GET /api/restaurant/mobile/restaurants/:id — restaurant header + operating hours (no menus) */
  @Get("mobile/restaurants/:id")
  mobileGetRestaurant(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.mobileGetRestaurant(id);
  }

  /** GET /api/restaurant/mobile/restaurants/:id/menus — menu list for a restaurant */
  @Get("mobile/restaurants/:id/menus")
  mobileListMenus(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.mobileListMenus(id);
  }

  /** GET /api/restaurant/mobile/menus/:menuId — single menu with sections, meals, and option groups */
  @Get("mobile/menus/:menuId")
  mobileGetMenu(@Param("menuId", ParseUUIDPipe) menuId: string) {
    return this.service.mobileGetMenu(menuId);
  }

  /**
   * GET /api/restaurant/mobile/restaurants/:id/reviews?page=1&limit=20
   * Public paginated reviews + summary — for the customer-facing app.
   */
  @Get("mobile/restaurants/:id/reviews")
  mobileListRestaurantReviews(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.analytics.listReviews(id, query.page, query.limit);
  }

  // ─── Must be last: wildcard catches any GET /:id not matched above ────────────

  /** GET /api/restaurant/:id — public full menu tree */
  @Get(":id")
  getRestaurant(@Param("id") id: string) {
    return this.service.getPublicRestaurantWithMenu(id);
  }
}
