export interface UpdateRestaurantDto {
  name?: string;
  description?: string;
  phone?: string;
  street?: string;
  city?: string;
  deliveryRadiusKm?: number;
  minOrderAmount?: number;
  avgDeliveryMinutes?: number;
  logoUrl?: string;
  coverUrl?: string;
}

export interface UpdateStoreStatusDto {
  isOpen: boolean;
}

export interface UpdateRestaurantHourDto {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}
