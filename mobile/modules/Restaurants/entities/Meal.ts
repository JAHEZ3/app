export type SelectionType = 'single' | 'multiple';

export interface MealOption {
    id: string;
    name: string;
    extraPrice: number;
    isAvailable: boolean;
}

export interface MealOptionGroup {
    id: string;
    name: string;
    selectionType: SelectionType;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    options: MealOption[];
}

export interface Meal {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    basePrice?: number;
    discountPrice?: number;
    calories?: number;
    isFeatured?: boolean;
    tags?: string[];
    isAvailable: boolean;
    optionGroups: MealOptionGroup[];
}
