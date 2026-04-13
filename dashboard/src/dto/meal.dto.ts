export interface CreateMealDto {
  sectionId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  discountPrice?: number;
  calories?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  displayOrder?: number;
}

export interface UpdateMealDto {
  name?: string;
  description?: string;
  imageUrl?: string;
  basePrice?: number;
  discountPrice?: number;
  calories?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  displayOrder?: number;
}

export interface CreateMenuDto {
  name: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface CreateMenuSectionDto {
  menuId: string;
  name: string;
  description?: string;
  displayOrder?: number;
}
