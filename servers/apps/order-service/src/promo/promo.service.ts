import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Or } from 'typeorm';
import { PromoCode } from '../entities/promo-code.entity';
import { PromoCodeUsage } from '../entities/promo-code-usage.entity';
import { DiscountType } from '../entities/order-enums';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './promo.dto';

export interface PromoValidationResult {
  promoCodeId: string;
  discountAmount: number;
  code: string;
}

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(PromoCode) private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoCodeUsage) private readonly usageRepo: Repository<PromoCodeUsage>,
  ) {}

  async validate(
    code: string,
    orderAmount: number,
    customerId: string,
    restaurantId?: string,
  ): Promise<PromoValidationResult> {
    const promo = await this.promoRepo.findOne({ where: { code: code.toUpperCase() } });
    if (!promo) throw new BadRequestException('كود الخصم غير صالح');

    const now = new Date();
    if (promo.validFrom && promo.validFrom > now)
      throw new BadRequestException('كود الخصم لم يبدأ بعد');
    if (promo.validUntil && promo.validUntil < now)
      throw new BadRequestException('انتهت صلاحية كود الخصم');
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit)
      throw new BadRequestException('تم استنفاد كود الخصم');
    if (promo.restaurantId && promo.restaurantId !== restaurantId)
      throw new BadRequestException('كود الخصم غير متاح لهذا المطعم');
    if (Number(promo.minOrderAmount) > 0 && orderAmount < Number(promo.minOrderAmount))
      throw new BadRequestException(
        `الحد الأدنى للطلب هو ${promo.minOrderAmount} شيكل لاستخدام هذا الكود`,
      );

    const userUsageCount = await this.usageRepo.count({
      where: { promoCodeId: promo.id, customerId },
    });
    if (userUsageCount >= promo.perUserLimit)
      throw new BadRequestException('لقد استخدمت هذا الكود بالحد الأقصى المسموح به');

    let discountAmount =
      promo.discountType === DiscountType.PERCENTAGE
        ? (orderAmount * Number(promo.discountValue)) / 100
        : Number(promo.discountValue);

    if (promo.maxDiscountCap && discountAmount > Number(promo.maxDiscountCap)) {
      discountAmount = Number(promo.maxDiscountCap);
    }
    if (discountAmount > orderAmount) discountAmount = orderAmount;

    return { promoCodeId: promo.id, discountAmount, code: promo.code };
  }

  async recordUsage(
    promoCodeId: string,
    customerId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.usageRepo.save(
      this.usageRepo.create({ promoCodeId, customerId, orderId, discountAmount }),
    );
    await this.promoRepo.increment({ id: promoCodeId }, 'usageCount', 1);
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const existing = await this.promoRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new ConflictException('كود الخصم موجود مسبقاً');

    return this.promoRepo.save(
      this.promoRepo.create({
        ...dto,
        code: dto.code.toUpperCase(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      }),
    );
  }

  async list(restaurantId?: string) {
    const where = restaurantId ? { restaurantId } : {};
    return this.promoRepo.find({ where, order: { validUntil: 'ASC' } });
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('كود الخصم غير موجود');
    Object.assign(promo, {
      ...dto,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : promo.validUntil,
    });
    return this.promoRepo.save(promo);
  }

  async remove(id: string): Promise<void> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('كود الخصم غير موجود');
    await this.promoRepo.remove(promo);
  }
}
