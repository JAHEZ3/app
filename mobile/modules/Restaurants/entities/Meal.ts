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
    isAvailable: boolean;
    optionGroups: MealOptionGroup[];
}
