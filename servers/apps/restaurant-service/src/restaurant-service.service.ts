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
import * as bcrypt from "bcrypt";
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

  async completeProfile(userId: string, dto: CompleteRestaurantProfileDto) {
    const restaurant = await this.getOwnedRestaurant(userId);

    // Prevent re-submission if already approved or a pending request exists
    const existingRequest = await this.requestRepo.findOne({
      where: {
        restaurantId: restaurant.id,
        status: RestaurantRequestStatus.PENDING,
      },
    });
    if (existingRequest) {
      throw new BadRequestException("Your application is already under review");
    }

    // Update restaurant record with profile data
    await this.restaurantRepo.update(restaurant.id, {
      name: dto.restaurantName,
      ownerName: dto.ownerName,
      description: dto.description,
      logoUrl: dto.logoUrl,
      street: dto.street,
      city: dto.city,
      cuisineType: dto.cuisineType,
    });

    // Create the approval request
    const request = await this.requestRepo.save(
      this.requestRepo.create({ restaurantId: restaurant.id }),
    );

    // Forward hashed password to auth-service
    const passwordHash = await bcrypt.hash(dto.password, 10);
    this.natsClient.emit("user.password.set", { userId, passwordHash });

    // Notify auth-service that profile is complete → sets profileCompleted=true on User
    this.natsClient.emit("restaurant.profile.completed", {
      userId,
      requestId: request.id,
    });

    this.logger.log(
      `Profile completed for restaurant ownerId: ${userId} — pending approval`,
    );
    return { message: "Profile submitted for admin review" };
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

    return { data: requests, message: "Pending applications retrieved" };
  }

  // ─── Manager: approve application ────────────────────────────────────────────

  async approveApplication(requestId: string, managerId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("Application not found");
    if (request.status !== RestaurantRequestStatus.PENDING) {
      throw new BadRequestException("Application is no longer pending");
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
    this.natsClient.emit("restaurant.owner.approved", {
      userId: restaurant!.ownerUserId,
      requestId: request.id,
    });

    this.logger.log(
      `Restaurant request ${requestId} approved by manager ${managerId}`,
    );
    return { message: "Application approved — restaurant is now active" };
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
    if (!request) throw new NotFoundException("Application not found");
    if (request.status !== RestaurantRequestStatus.PENDING) {
      throw new BadRequestException("Application is no longer pending");
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
    this.natsClient.emit("restaurant.owner.rejected", {
      userId: restaurant!.ownerUserId,
      requestId: request.id,
      reason,
    });

    this.logger.log(
      `Restaurant request ${requestId} rejected by manager ${managerId}`,
    );
    return { message: "Application rejected" };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async getOwnedRestaurant(ownerId: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { ownerUserId: ownerId },
    });
    if (!restaurant)
      throw new NotFoundException("Restaurant not found for this account");
    return restaurant;
  }

  private async assertMenuOwner(
    menuId: string,
    restaurantId: string,
  ): Promise<Menu> {
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException("Menu not found");
    if (menu.restaurantId !== restaurantId)
      throw new ForbiddenException("Not your menu");
    return menu;
  }

  private async assertSectionOwner(
    sectionId: string,
    restaurantId: string,
  ): Promise<MenuSection> {
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException("Section not found");
    const menu = await this.menuRepo.findOne({ where: { id: section.menuId } });
    if (!menu || menu.restaurantId !== restaurantId)
      throw new ForbiddenException("Not your section");
    return section;
  }

  private async assertMealOwner(
    mealId: string,
    restaurantId: string,
  ): Promise<Meal> {
    const meal = await this.mealRepo.findOne({ where: { id: mealId } });
    if (!meal) throw new NotFoundException("Meal not found");
    if (meal.restaurantId !== restaurantId)
      throw new ForbiddenException("Not your meal");
    return meal;
  }

  private async assertOptionGroupOwner(
    groupId: string,
    restaurantId: string,
  ): Promise<MealOptionGroup> {
    const group = await this.optionGroupRepo.findOne({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException("Option group not found");
    await this.assertMealOwner(group.mealId, restaurantId);
    return group;
  }

  // ─── Restaurant Profile & Settings ────────────────────────────────────────────

  async getProfile(ownerId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    return { data: restaurant, message: "Profile retrieved" };
  }

  async updateProfile(ownerId: string, dto: UpdateProfileDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.restaurantRepo.update(restaurant.id, { ...dto });
    return {
      data: await this.restaurantRepo.findOne({ where: { id: restaurant.id } }),
      message: "Profile updated",
    };
  }

  async updateSettings(ownerId: string, dto: UpdateSettingsDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.restaurantRepo.update(restaurant.id, { ...dto });
    return {
      data: await this.restaurantRepo.findOne({ where: { id: restaurant.id } }),
      message: "Settings updated",
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
    return { data: hours, message: "Hours retrieved" };
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
    return { data: hours, message: "Hours updated" };
  }

  // ─── Public Listing ───────────────────────────────────────────────────────────

  async listPublicRestaurants(city?: string) {
    const qb = this.restaurantRepo
      .createQueryBuilder("r")
      .where("r.status = :status", { status: RestaurantStatus.ACTIVE });

    if (city) qb.andWhere("r.city ILIKE :city", { city: `%${city}%` });

    const restaurants = await qb.orderBy("r.rating", "DESC").getMany();
    return { data: restaurants, message: "Restaurants retrieved" };
  }

  async getPublicRestaurantWithMenu(restaurantId: string) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: restaurantId, status: RestaurantStatus.ACTIVE },
    });
    if (!restaurant) throw new NotFoundException("Restaurant not found");

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
    return { data: menus, message: "Menus retrieved" };
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
    return { data: menu, message: "Menu created" };
  }

  async updateMenu(ownerId: string, menuId: string, dto: UpdateMenuDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menu = await this.assertMenuOwner(menuId, restaurant.id);
    await this.menuRepo.update(menu.id, { ...dto });
    return {
      data: await this.menuRepo.findOne({ where: { id: menu.id } }),
      message: "Menu updated",
    };
  }

  async deleteMenu(ownerId: string, menuId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const menu = await this.assertMenuOwner(menuId, restaurant.id);
    await this.menuRepo.delete(menu.id);
    return { data: null, message: "Menu deleted" };
  }

  // ─── Menu Sections ────────────────────────────────────────────────────────────

  async getSections(ownerId: string, menuId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertMenuOwner(menuId, restaurant.id);
    const sections = await this.sectionRepo.find({ where: { menuId } });
    return { data: sections, message: "Sections retrieved" };
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
    return { data: section, message: "Section created" };
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
      message: "Section updated",
    };
  }

  async deleteSection(ownerId: string, sectionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const section = await this.assertSectionOwner(sectionId, restaurant.id);
    await this.sectionRepo.delete(section.id);
    return { data: null, message: "Section deleted" };
  }

  // ─── Meals ────────────────────────────────────────────────────────────────────

  async getMeals(ownerId: string, sectionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertSectionOwner(sectionId, restaurant.id);
    const meals = await this.mealRepo.find({ where: { sectionId } });
    return { data: meals, message: "Meals retrieved" };
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
    return { data: meal, message: "Meal created" };
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
      message: "Meal updated",
    };
  }

  async deleteMeal(ownerId: string, mealId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const meal = await this.assertMealOwner(mealId, restaurant.id);
    await this.mealRepo.delete(meal.id);
    return { data: null, message: "Meal deleted" };
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
    return { data: groups, message: "Option groups retrieved" };
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
    return { data: group, message: "Option group created" };
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
      message: "Option group updated",
    };
  }

  async deleteOptionGroup(ownerId: string, groupId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const group = await this.assertOptionGroupOwner(groupId, restaurant.id);
    await this.optionGroupRepo.delete(group.id);
    return { data: null, message: "Option group deleted" };
  }

  // ─── Meal Options ─────────────────────────────────────────────────────────────

  async getOptions(ownerId: string, groupId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    await this.assertOptionGroupOwner(groupId, restaurant.id);
    const options = await this.optionRepo.find({ where: { groupId } });
    return { data: options, message: "Options retrieved" };
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
    return { data: option, message: "Option created" };
  }

  async updateOption(ownerId: string, optionId: string, dto: UpdateOptionDto) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const option = await this.optionRepo.findOne({ where: { id: optionId } });
    if (!option) throw new NotFoundException("Option not found");
    await this.assertOptionGroupOwner(option.groupId, restaurant.id);
    await this.optionRepo.update(option.id, { ...dto });
    return {
      data: await this.optionRepo.findOne({ where: { id: option.id } }),
      message: "Option updated",
    };
  }

  async deleteOption(ownerId: string, optionId: string) {
    const restaurant = await this.getOwnedRestaurant(ownerId);
    const option = await this.optionRepo.findOne({ where: { id: optionId } });
    if (!option) throw new NotFoundException("Option not found");
    await this.assertOptionGroupOwner(option.groupId, restaurant.id);
    await this.optionRepo.delete(option.id);
    return { data: null, message: "Option deleted" };
  }
}
