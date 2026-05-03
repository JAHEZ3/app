import { Restaurant } from './Restaurant';

export interface RestaurantDetails extends Restaurant {
    street?: string;
    address?: string;
    description?: string;
    phone?: string;
    deliveryFee?: number;
    estimatedDeliveryTime?: number;
    openingHours?: string;
}
