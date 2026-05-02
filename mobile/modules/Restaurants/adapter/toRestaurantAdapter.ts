import { RestaurantDTO } from '../dto/Restaurant';
import { Restaurant } from '../entities/Restaurant';

export const toRestaurantAdapter = (dto: RestaurantDTO): Restaurant => ({
    id: dto.id,
    name: dto.name,
    logoUrl: dto.logoUrl,
    coverUrl: dto.coverUrl,
    city: dto.city,
    cuisineType: dto.cuisineType,
    rating: Number(dto.rating ?? 0),
    totalRatings: Number(dto.totalRatings ?? 0),
    minOrderAmount: Number(dto.minOrderAmount ?? 0),
    isOpen: Boolean(dto.isOpen),
});
