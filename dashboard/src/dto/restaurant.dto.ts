export interface UpdateRestaurantDto {
  name?: string;
  description?: string;
  phone?: string;
  street?: string;
  city?: string;
  logoUrl?: string;
  coverUrl?: string;
  cuisineType?: string;
}

export interface UpdateSettingsDto {
  lat?: number;
  lng?: number;
  deliveryRadiusKm?: number;
  minOrderAmount?: number;
  avgDeliveryMinutes?: number;
}

export interface UpdateStoreStatusDto {
  isOpen: boolean;
}

export interface RestaurantHourEntryDto {
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  openTime: string;  // "HH:MM"
  closeTime: string; // "HH:MM"
}

export interface SetRestaurantHoursDto {
  hours: RestaurantHourEntryDto[]; // must contain all 7 days
}
