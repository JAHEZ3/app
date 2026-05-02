export interface MenuDTO {
    id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    mealCount?: number;
    mealsCount?: number;
    totalMeals?: number;
    meals?: unknown[];
}

export interface MenusResponseDTO {
    data: MenuDTO[];
}
