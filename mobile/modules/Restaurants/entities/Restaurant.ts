export interface Restaurant {
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
