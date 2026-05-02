import { PaginationMeta } from '../types';

export interface RestaurantDTO {
    id: string;
    name: string;
    logoUrl: string;
    coverUrl: string;
    city: string;
    cuisineType: string;
    rating: number;
    totalRatings: number;
    minOrderAmount: number;
    isOpen: boolean;
}

export interface RestaurantsResponseDTO {
    data: RestaurantDTO[];
    meta: PaginationMeta;
}

export interface RestaurantDetailsDTO extends RestaurantDTO {
    street?: string;
    address?: string;
    description?: string;
    phone?: string;
    deliveryFee?: number;
    estimatedDeliveryTime?: number;
    openingHours?: string;
}
