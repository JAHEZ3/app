import { RestaurantDetailsDTO } from '../dto/Restaurant';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { toRestaurantAdapter } from './toRestaurantAdapter';

export const toRestaurantDetailsAdapter = (dto: RestaurantDetailsDTO): RestaurantDetails => ({
    ...toRestaurantAdapter(dto),
    street: dto.street,
    address: dto.address,
    description: dto.description,
    phone: dto.phone,
    deliveryFee: dto.deliveryFee != null ? Number(dto.deliveryFee) : undefined,
    estimatedDeliveryTime:
        dto.estimatedDeliveryTime != null ? Number(dto.estimatedDeliveryTime) : undefined,
    openingHours: dto.openingHours,
});
