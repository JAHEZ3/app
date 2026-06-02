import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "./entities/customer.entity";
import { CustomerAddress } from "./entities/customer-address.entity";
import { CreateAddressDto, UpdateAddressDto } from "./dto/address.dto";

/**
 * Per-customer address book. A customer may have many addresses; one is flagged
 * `isDefault` and propagates to `customer.default_address_id`. Address create
 * is allowed even before profile completion so the onboarding flow can capture
 * a delivery address up-front.
 */
@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private readonly addressRepo: Repository<CustomerAddress>,
  ) {}

  private async getCustomer(userId: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { userId } });
    if (!customer) throw new NotFoundException("الملف الشخصي للعميل غير موجود.");
    return customer;
  }

  async list(userId: string) {
    const customer = await this.getCustomer(userId);
    const items = await this.addressRepo.find({
      where: { customerId: customer.id },
      order: { isDefault: "DESC", createdAt: "DESC" },
    });
    return { data: items, message: null };
  }

  async create(userId: string, dto: CreateAddressDto) {
    const customer = await this.getCustomer(userId);

    // First address always becomes the default — saves the customer a click.
    const existingCount = await this.addressRepo.count({
      where: { customerId: customer.id },
    });
    const makeDefault = dto.isDefault ?? existingCount === 0;

    if (makeDefault) {
      await this.addressRepo.update(
        { customerId: customer.id },
        { isDefault: false },
      );
    }

    const address = await this.addressRepo.save(
      this.addressRepo.create({
        customerId: customer.id,
        label: dto.label ?? null,
        street: dto.street,
        city: dto.city ?? null,
        building: dto.building ?? null,
        floor: dto.floor ?? null,
        notes: dto.notes ?? null,
        lat: dto.lat,
        lng: dto.lng,
        isDefault: makeDefault,
      }),
    );

    if (makeDefault) {
      await this.customerRepo.update(customer.id, { defaultAddressId: address.id });
    }

    return { data: address, message: "تمت إضافة العنوان." };
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const customer = await this.getCustomer(userId);
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId: customer.id },
    });
    if (!address) throw new NotFoundException("العنوان غير موجود.");

    if (dto.isDefault) {
      await this.addressRepo.update(
        { customerId: customer.id },
        { isDefault: false },
      );
      await this.customerRepo.update(customer.id, { defaultAddressId: address.id });
    }

    Object.assign(address, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.street !== undefined && { street: dto.street }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.building !== undefined && { building: dto.building }),
      ...(dto.floor !== undefined && { floor: dto.floor }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.lat !== undefined && { lat: dto.lat }),
      ...(dto.lng !== undefined && { lng: dto.lng }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    });
    await this.addressRepo.save(address);

    return { data: address, message: "تم تحديث العنوان." };
  }

  async setDefault(userId: string, addressId: string) {
    const customer = await this.getCustomer(userId);
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId: customer.id },
    });
    if (!address) throw new NotFoundException("العنوان غير موجود.");

    await this.addressRepo.update(
      { customerId: customer.id },
      { isDefault: false },
    );
    address.isDefault = true;
    await this.addressRepo.save(address);
    await this.customerRepo.update(customer.id, { defaultAddressId: address.id });

    return { data: address, message: "تم تعيين العنوان كافتراضي." };
  }

  async remove(userId: string, addressId: string) {
    const customer = await this.getCustomer(userId);
    const address = await this.addressRepo.findOne({
      where: { id: addressId, customerId: customer.id },
    });
    if (!address) throw new NotFoundException("العنوان غير موجود.");

    const wasDefault = address.isDefault;
    await this.addressRepo.remove(address);

    if (wasDefault) {
      // Promote the most recent remaining address to default — keeps a sensible
      // fallback for checkout flows.
      const next = await this.addressRepo.findOne({
        where: { customerId: customer.id },
        order: { createdAt: "DESC" },
      });
      if (next) {
        next.isDefault = true;
        await this.addressRepo.save(next);
        await this.customerRepo.update(customer.id, { defaultAddressId: next.id });
      } else {
        await this.customerRepo.update(customer.id, {
          defaultAddressId: null as unknown as string,
        });
      }
    }

    return { data: { id: addressId }, message: "تم حذف العنوان." };
  }
}
