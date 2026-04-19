import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { Restaurant, RestaurantStatus } from "./entities/restaurant.entity";
import { RestaurantHour } from "./entities/restaurant-hour.entity";
import { Menu } from "./entities/menu.entity";
import { MenuSection } from "./entities/menu-section.entity";
import { Meal } from "./entities/meal.entity";
import { MealOptionGroup } from "./entities/meal-option-group.entity";
import { MealOption } from "./entities/meal-option.entity";
import {
  RestaurantRequest,
  RestaurantRequestStatus,
} from "./entities/restaurant-request.entity";
import { CompleteRestaurantProfileDto } from "./dto/complete-profile.dto";
import { parseAndValidatePaymentInfo } from "./common/payment-info";
import { S3Service } from "./s3.service";
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

@Injectable()
export class RestaurantServiceService {
  private readonly logger = new Logger(RestaurantServiceService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RestaurantRequest)
    private readonly requestRepo: Repository<RestaurantRequest>,
    @InjectRepository(RestaurantHour)
    private readonly hoursRepo: Repository<RestaurantHour>,
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
    @InjectRepository(MenuSection)
    private readonly sectionRepo: Repository<MenuSection>,
    @InjectRepository(Meal)
    private readonly mealRepo: Repository<Meal>,
    @InjectRepository(MealOptionGroup)
    private readonly optionGroupRepo: Repository<MealOptionGroup>,
    @InjectRepository(MealOption)
    private readonly optionRepo: Repository<MealOption>,
    @Inject("NATS_SERVICE")
    private readonly natsClient: ClientProxy,
    private readonly s3: S3Service,
  ) {}

  // ─── NATS: create profile stub on registration ────────────────────────────────

  async createProfileStub(data: { userId: string; phone: string }) {
    const existing = await this.restaurantRepo.findOne({
      where: { ownerUserId: data.userId },
    });
    if (existing) {
      this.logger.warn(
        `Restaurant stub already exists for userId: ${data.userId}`,
      );
      return;
    }
    await this.restaurantRepo.save(
      this.restaurantRepo.create({
        ownerUserId: data.userId,
        phone: data.phone,
        status: RestaurantStatus.PENDING_APPROVAL,
        isOpen: false,
      }),
    );
    this.logger.log(`Restaurant stub created for userId: ${data.userId}`);
  }

  // ─── HTTP: first-time profile completion ──────────────────────────────────────

  async completeProfile(
    userId: string,
    phone: string,
    dto: CompleteRestaurantProfileDto,
    files: {
      logo?: Express.Multer.File[];
      ownerIdPicture?: Express.Multer.File[];
    },
  ) {
    if (!dto.termsAccepted) {
      throw new BadRequestException("يجب قبول الشروط والسياسة للمتابعة.");
    }
    if (!files?.logo?.[0]) {
      throw new BadRequestException("شعار المطعم مطلوب.");
    }
    if (!files?.ownerIdPicture?.[0]) {
      throw new BadRequestException("صورة هوية المالك مطلوبة.");
    }

    // Create the stub if it doesn't exist yet (handles cases where the NATS
    // event was missed — e.g. service was down at registration time).
    await this.createProfileStub({ userId, phone });

    const restaurant = await this.getOwnedRestaurant(userId);

    let paymentInfo: ReturnType<typeof parseAndValidatePaymentInfo>;
    try {
      paymentInfo = parseAndValidatePaymentInfo(dto.paymentInfo);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    // Prevent re-submission if a pending request already exists
    const existingRequest = await this.requestRepo.findOne({
      where: {
        restaurantId: restaurant.id,
        status: RestaurantRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      throw new BadRequestException("طلبك قيد المراجعة بالفعل.");
    }

    // Upload files to private S3 bucket
    let logoKey: string;
    let ownerIdKey: string;
    try {
      [logoKey, ownerIdKey] = await Promise.all([
        this.s3.upload(files.logo[0], "restaurant"),
        this.s3.upload(files.ownerIdPicture[0], "restaurant"),
      ]);
    } catch (err) {
      this.logger.error("S3 upload failed during completeProfile", err);
      throw new BadRequestException("فشل رفع الملفات. يرجى المحاولة مجدداً.");
    }

    // Update restaurant record with all profile data
    await this.restaurantRepo.update(restaurant.id, {
      name: dto.restaurantName,
      ownerName: dto.ownerName,
      ownerNationalIdNumber: dto.ownerNationalIdNumber,
      commercialRegNumber: dto.commercialRegNumber,
      phone: dto.restaurantPhone,
      description: dto.description,
      logoUrl: logoKey,
      street: dto.street,
      city: dto.city,
      cuisineType: dto.cuisineType,
      lat: dto.lat,
      lng: dto.lng,
      paymentInfo,
      termsAccepted: true,
    });

    // Create the approval request with S3 keys
    const request = await this.requestRepo.save(
      this.requestRepo.create({
        restaurantId: restaurant.id,
        logoUrl: logoKey,
        ownerIdPictureUrl: ownerIdKey,
      }),
    );

    // Auth-service hashes the password — never send a hash over NATS
    try {
      this.natsClient.emit("user.password.set", { userId, password: dto.password });
    } catch (err) {
      this.logger.error("NATS emit user.password.set failed", err);
    }

    // Notify auth-service that profile is complete → sets profileCompleted=true on User
    try {
      this.natsClient.emit("restaurant.profile.completed", { userId, requestId: request.id });
    } catch (err) {
      this.logger.error("NATS emit restaurant.profile.completed failed", err);
    }

    this.logger.log(
      `Profile completed for restaurant ownerId: ${userId} — pending approval`,
    );
    return { message: "تم تقديم الملف الشخصي للمراجعة." };
  }

  // ─── Manager: list pending applications ───────────────────────────────────────

  async getPendingApplications() {
    const requests = await this.requestRepo
      .createQueryBuilder("req")
      .leftJoinAndMapOne(
        "req.restaurant",
        Restaurant,
        "r",
        "r.id = req.restaurantId",
      )
      .where("req.status = :status", {
        status: RestaurantRequestStatus.PENDING,
      })
      .orderBy("req.submittedAt", "ASC")
      .getMany();

    // Generate short-lived presigned URLs — failures are isolated per request
    const data = await Promise.all(
      requests.map(async (req: any) => {
        const presign = async (key: string | null | undefined) => {
          if (!key) return null;
          try { return await this.s3.presignedUrl(key); }
          catch (err) {
            this.logger.error(`Failed to presign key ${key}`, err);
            return null;
          }
        };
        const [logoUrl, ownerIdPictureUrl] = await Promise.all([
          presign(req.logoUrl),
          presign(req.ownerIdPictureUrl),
        ]);
        return { ...req, logoUrl, ownerIdPictureUrl };
      }),
    );

    return { data, message: "تم استرجاع الطلبات المعلقة." };
  }

  // ─── Manager: approve application ────────────────────────────────────────────

  async approveApplication(requestId: string, managerId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("الطلب غير موجود.");
    if (request.status !== RestaurantRequestStatus.PENDING) {
      throw new BadRequestException("الطلب لم يعد معلقاً.");
    }

    // Mark request approved
    await this.requestRepo.update(request.id, {
      status: RestaurantRequestStatus.APPROVED,
      reviewedBy: managerId,
      reviewedAt: new Date(),
    });

    // Activate the restaurant record
    await this.restaurantRepo.update(request.restaurantId, {
      status: RestaurantStatus.ACTIVE,
    });

    // Get the owner's userId so auth-service can flip User.status → ACTIVE
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: request.restaurantId },
    });
    if (!restaurant) throw new NotFoundException("بيانات المطعم غير موجودة.");
    try {
      this.natsClient.emit("restaurant.owner.approved", {
        userId: restaurant.ownerUserId,
        requestId: request.id,
      });
    } catch (err) {
      this.logger.error("NATS emit restaurant.owner.approved failed", err);
    }

    this.logger.log(
      `Restaurant request ${requestId} approved by manager ${managerId}`,
    );
    return { message: "تمت الموافقة على الطلب. المطعم نشط الآن." };
  }

  // ─── Manager: reject application ─────────────────────────────────────────────

  async rejectApplication(
    requestId: string,
    managerId: string,
    reason?: string,
  ) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("الطلب غير موجود.");
    if (request.status !== RestaurantRequestStatus.PENDING) {
      throw new BadRequestException("الطلب لم يعد معلقاً.");
    }

    await this.requestRepo.update(request.id, {
      status: RestaurantRequestStatus.REJECTED,
      reviewedBy: managerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });

    const restaurant = await this.restaurantRepo.findOne({
      where: { id: request.restaurantId },
    });
    if (!restaurant) throw new NotFoundException("بيانات المطعم غير موجودة.");
    try {
      this.natsClient.emit("restaurant.owner.rejected", {
        userId: restaurant.ownerUserId,
        requestId: request.id,
        reason,
      });
    } catch (err) {
      this.logger.error("NATS emit restaurant.owner.rejected failed", err);
    }

    this.logger.log(
      `Restaurant request ${requestId} rejected by manager ${managerId}`,
    );
    return { message: "تم رفض الطلب." };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async getOwnedRestaurant(ownerId: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { ownerUserId: ownerId },
    });
    if (!restaurant)
      throw new NotFoundException("لم يُعثر على مطعم لهذا الحساب.");
    return restaurant;
  }

  private async assertMenuOwner(
    menuId: string,
    restaurantId: string,
  ): Promise<Menu> {
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException("القائمة غير موجودة.");
    if (menu.restaurantId !== restaurantId)
      throw new ForbiddenException("هذه القائمة لا تخصك.");
    return menu;
  }

  private async assertSectionOwner(
    sectionId: string,
    restaurantId: string,
  ): Promise<MenuSection> {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException("القسم غير موجود.");
    const menu = await this.menuRepo.findOne({ where: { id: section.menuId } });
    if (!menu || menu.restaurantId !== restaurantId)
      throw new ForbiddenException("هذا القسم لا يخصك.");
    return section;
  }

  private async assertMealOwner(
    mealId: string,
    restaurantId: string,
  ): Promise<Meal> {
    const meal = await this.mealRepo.findOne({ where: { id: mealId } });
    if (!meal) throw new NotFoundException("الوجبة غير موجودة.");
    if (meal.restaurantId !== restaurantId)
      throw new ForbiddenException("هذه الوجبة لا تخصك.");
    return meal;
  }

  private async assertOptionGroupOwner(
    groupId: string,
    restaurantId: string,
  ): Promise<MealOptionGroup> {
    const group = await this.optionGroupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException("مجموعة الخيارات غير موجودة.");
    await this.assertMealOwner(group.mealId, restaurantId);
    return group;
  }

  // ─── Helpers — presigned URLs ─────────────────────────────────────────────────

  private async withPresignedUrls(restaurant: Restaurant): Promise<Restaurant & { logoUrl?: string; coverUrl?: string }> {
    const [logoUrl, coverUrl] = await Promise.all([
      restaurant.logoUrl ? this.s3.presignedUrl(restaurant.logoUrl) : undefined,
      restaurant.coverUrl ? this.s3.presignedUrl(restaurant.coverUrl) : undefined,
    ]);
    return { ...restaurant, ...(logoUrl && { logoUrl }), ...(coverUrl && { coverUrl }) };
  }

  // ─── Restaurant Profile & Settings ────────────────────────────────────────────

  async getProfile(ownerId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);

    // Latest request holds ownerIdPicture
    const request = await this.requestRepo.findOne({
      where: { restaurantId: restaurant.id },
      order: { submittedAt: 'DESC' },
    });

    const ownerIdPictureUrl = request?.ownerIdPictureUrl
      ? await this.s3.presignedUrl(request.ownerIdPictureUrl)
      : null;

    const data = {
      ...(await this.withPresignedUrls(restaurant)),
      ownerIdPictureUrl,
      applicationStatus: request?.status ?? null,
      rejectionReason: request?.rejectionReason ?? null,
    };

    return { data, message: "تم استرجاع الملف الشخصي." };
  }

  async updateProfile(ownerId: string, dto: UpdateProfileDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.restaurantRepo.update(restaurant.id, { ...dto });
    const updated = await this.restaurantRepo.findOne({ where: { id: restaurant.id } });
    if (!updated) throw new NotFoundException("لم يُعثر على المطعم بعد التحديث.");
    return {
      data: await this.withPresignedUrls(updated),
      message: "تم تحديث الملف الشخصي.",
    };
  }

  async updateSettings(ownerId: string, dto: UpdateSettingsDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.restaurantRepo.update(restaurant.id, { ...dto });
    return {
      data: await this.restaurantRepo.findOne({ where: { id: restaurant.id } }),
      message: "تم تحديث الإعدادات.",
    };
  }

  async toggleOpen(ownerId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const newState = !restaurant.isOpen;
    await this.restaurantRepo.update(restaurant.id, { isOpen: newState });
    return {
      data: { isOpen: newState },
      message: newState ? "Restaurant is now open" : "Restaurant is now closed",
    };
  }

  // ─── Operating Hours ──────────────────────────────────────────────────────────

  async getHours(ownerId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const hours = await this.hoursRepo.find({
      where: { restaurantId: restaurant.id },
    });
    return { data: hours, message: "تم استرجاع أوقات العمل." };
  }

  async setHours(ownerId: string, dto: SetHoursDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);

    for (const entry of dto.hours) {
      const existing = await this.hoursRepo.findOne({
        where: { restaurantId: restaurant.id, dayOfWeek: entry.dayOfWeek },
      });
      if (existing) {
        await this.hoursRepo.update(existing.id, {
          openTime: entry.openTime,
          closeTime: entry.closeTime,
        });
      } else {
        await this.hoursRepo.save(
          this.hoursRepo.create({
            restaurantId: restaurant.id,
            dayOfWeek: entry.dayOfWeek,
            openTime: entry.openTime,
            closeTime: entry.closeTime,
          }),
        );
      }
    }

    const hours = await this.hoursRepo.find({
      where: { restaurantId: restaurant.id },
    });
    return { data: hours, message: "تم تحديث أوقات العمل." };
  }

  // ─── Public Listing ───────────────────────────────────────────────────────────

  async listPublicRestaurants(city?: string) {
    const qb = this.restaurantRepo
      .createQueryBuilder("r")
      .where("r.status = :status", { status: RestaurantStatus.ACTIVE });

    if (city) qb.andWhere("r.city ILIKE :city", { city: `%${city}%` });

    const restaurants = await qb.orderBy("r.rating", "DESC").getMany();
    return { data: restaurants, message: "تم استرجاع المطاعم." };
  }

  async getPublicRestaurantWithMenu(restaurantId: string) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, status: RestaurantStatus.ACTIVE },
    });
    if (!restaurant) throw new NotFoundException("المطعم غير موجود.");

    const menus = await this.menuRepo.find({
      where: { restaurantId, isActive: true },
    });

    const menusWithSections = await Promise.all(
      menus.map(async (menu) => {
        const sections = await this.sectionRepo.find({
          where: { menuId: menu.id },
        });
        const sectionsWithMeals = await Promise.all(
          sections.map(async (section) => {
            const meals = await this.mealRepo.find({
              where: { sectionId: section.id, isAvailable: true },
            });
            const mealsWithOptions = await Promise.all(
              meals.map(async (meal) => {
                const optionGroups = await this.optionGroupRepo.find({
                  where: { mealId: meal.id },
                });
                const groupsWithOptions = await Promise.all(
                  optionGroups.map(async (group) => {
                    const options = await this.optionRepo.find({
                      where: { groupId: group.id, isAvailable: true },
                    });
                    return { ...group, options };
                  }),
                );
                return { ...meal, optionGroups: groupsWithOptions };
              }),
            );
            return { ...section, meals: mealsWithOptions };
          }),
        );
        return { ...menu, sections: sectionsWithMeals };
      }),
    );

    return {
      data: { ...restaurant, menus: menusWithSections },
      message: "Restaurant retrieved",
    };
  }

  // ─── Menus ────────────────────────────────────────────────────────────────────

  async getMenus(ownerId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menus = await this.menuRepo.find({
      where: { restaurantId: restaurant.id },
    });
    return { data: menus, message: "تم استرجاع القوائم." };
  }

  async createMenu(ownerId: string, dto: CreateMenuDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menu = await this.menuRepo.save(
      this.menuRepo.create({
        restaurantId: restaurant.id,
        name: dto.name,
        isActive: dto.isActive ?? true,
        displayOrder: dto.displayOrder ?? 0,
      }),
    );
    return { data: menu, message: "تم إنشاء القائمة." };
  }

  async updateMenu(ownerId: string, menuId: string, dto: UpdateMenuDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menu = await this.assertMenuOwner(menuId, restaurant.id);
    await this.menuRepo.update(menu.id, { ...dto });
    return {
      data: await this.menuRepo.findOne({ where: { id: menu.id } }),
      message: "تم تحديث القائمة.",
    };
  }

  async deleteMenu(ownerId: string, menuId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menu = await this.assertMenuOwner(menuId, restaurant.id);
    await this.menuRepo.delete(menu.id);
    return { data: null, message: "تم حذف القائمة." };
  }

  // ─── Menu Sections ────────────────────────────────────────────────────────────

  async getSections(ownerId: string, menuId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertMenuOwner(menuId, restaurant.id);
    const sections = await this.sectionRepo.find({ where: { menuId } });
    return { data: sections, message: "تم استرجاع الأقسام." };
  }

  async createSection(ownerId: string, menuId: string, dto: CreateSectionDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertMenuOwner(menuId, restaurant.id);
    const section = await this.sectionRepo.save(
      this.sectionRepo.create({
        menuId,
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
      }),
    );
    return { data: section, message: "تم إنشاء القسم." };
  }

  async updateSection(
    ownerId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const section = await this.assertSectionOwner(sectionId, restaurant.id);
    await this.sectionRepo.update(section.id, { ...dto });
    return {
      data: await this.sectionRepo.findOne({ where: { id: section.id } }),
      message: "تم تحديث القسم.",
    };
  }

  async deleteSection(ownerId: string, sectionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const section = await this.assertSectionOwner(sectionId, restaurant.id);
    await this.sectionRepo.delete(section.id);
    return { data: null, message: "تم حذف القسم." };
  }

  // ─── Meals ────────────────────────────────────────────────────────────────────

  async getMeals(ownerId: string, sectionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertSectionOwner(sectionId, restaurant.id);
    const meals = await this.mealRepo.find({ where: { sectionId } });
    return { data: meals, message: "تم استرجاع الوجبات." };
  }

  async createMeal(ownerId: string, dto: CreateMealDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertSectionOwner(dto.sectionId, restaurant.id);
    const meal = await this.mealRepo.save(
      this.mealRepo.create({
        restaurantId: restaurant.id,
        sectionId: dto.sectionId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        basePrice: dto.basePrice,
        discountPrice: dto.discountPrice,
        calories: dto.calories,
        isAvailable: dto.isAvailable ?? true,
        isFeatured: dto.isFeatured ?? false,
        tags: dto.tags,
        displayOrder: dto.displayOrder ?? 0,
      }),
    );
    return { data: meal, message: "تم إنشاء الوجبة." };
  }

  async updateMeal(ownerId: string, mealId: string, dto: UpdateMealDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const meal = await this.assertMealOwner(mealId, restaurant.id);

    if (dto.sectionId) {
      await this.assertSectionOwner(dto.sectionId, restaurant.id);
    }

    await this.mealRepo.update(meal.id, { ...dto });
    return {
      data: await this.mealRepo.findOne({ where: { id: meal.id } }),
      message: "تم تحديث الوجبة.",
    };
  }

  async deleteMeal(ownerId: string, mealId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const meal = await this.assertMealOwner(mealId, restaurant.id);
    await this.mealRepo.delete(meal.id);
    return { data: null, message: "تم حذف الوجبة." };
  }

  async toggleMealAvailability(ownerId: string, mealId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const meal = await this.assertMealOwner(mealId, restaurant.id);
    const newState = !meal.isAvailable;
    await this.mealRepo.update(meal.id, { isAvailable: newState });
    return {
      data: { isAvailable: newState },
      message: newState ? "Meal is now available" : "Meal is now unavailable",
    };
  }

  // ─── Meal Option Groups ───────────────────────────────────────────────────────

  async getOptionGroups(ownerId: string, mealId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertMealOwner(mealId, restaurant.id);
    const groups = await this.optionGroupRepo.find({ where: { mealId } });
    return { data: groups, message: "تم استرجاع مجموعات الخيارات." };
  }

  async createOptionGroup(
    ownerId: string,
    mealId: string,
    dto: CreateOptionGroupDto,
  ) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertMealOwner(mealId, restaurant.id);
    const group = await this.optionGroupRepo.save(
      this.optionGroupRepo.create({
        mealId,
        name: dto.name,
        selectionType: dto.selectionType,
        isRequired: dto.isRequired ?? false,
        maxSelections: dto.maxSelections,
      }),
    );
    return { data: group, message: "تم إنشاء مجموعة الخيارات." };
  }

  async updateOptionGroup(
    ownerId: string,
    groupId: string,
    dto: UpdateOptionGroupDto,
  ) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const group = await this.assertOptionGroupOwner(groupId, restaurant.id);
    await this.optionGroupRepo.update(group.id, { ...dto });
    return {
      data: await this.optionGroupRepo.findOne({ where: { id: group.id } }),
      message: "تم تحديث مجموعة الخيارات.",
    };
  }

  async deleteOptionGroup(ownerId: string, groupId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const group = await this.assertOptionGroupOwner(groupId, restaurant.id);
    await this.optionGroupRepo.delete(group.id);
    return { data: null, message: "تم حذف مجموعة الخيارات." };
  }

  // ─── Meal Options ─────────────────────────────────────────────────────────────

  async getOptions(ownerId: string, groupId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertOptionGroupOwner(groupId, restaurant.id);
    const options = await this.optionRepo.find({ where: { groupId } });
    return { data: options, message: "تم استرجاع الخيارات." };
  }

  async createOption(ownerId: string, groupId: string, dto: CreateOptionDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertOptionGroupOwner(groupId, restaurant.id);
    const option = await this.optionRepo.save(
      this.optionRepo.create({
        groupId,
        name: dto.name,
        extraPrice: dto.extraPrice ?? 0,
        isAvailable: dto.isAvailable ?? true,
      }),
    );
    return { data: option, message: "تم إنشاء الخيار." };
  }

  async updateOption(ownerId: string, optionId: string, dto: UpdateOptionDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const option = await this.optionRepo.findOne({ where: { id: optionId } });
    if (!option) throw new NotFoundException("الخيار غير موجود.");
    await this.assertOptionGroupOwner(option.groupId, restaurant.id);
    await this.optionRepo.update(option.id, { ...dto });
    return {
      data: await this.optionRepo.findOne({ where: { id: option.id } }),
      message: "تم تحديث الخيار.",
    };
  }

  async deleteOption(ownerId: string, optionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const option = await this.optionRepo.findOne({ where: { id: optionId } });
    if (!option) throw new NotFoundException("الخيار غير موجود.");
    await this.assertOptionGroupOwner(option.groupId, restaurant.id);
    await this.optionRepo.delete(option.id);
    return { data: null, message: "تم حذف الخيار." };
  }
}
