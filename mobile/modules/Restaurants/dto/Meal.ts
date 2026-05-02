export type SelectionTypeDTO = 'single' | 'multiple' | 'SINGLE' | 'MULTIPLE';

export interface MealOptionDTO {
    id: string;
    name: string;
    extraPrice?: number;
    price?: number;
    isAvailable?: boolean;
}

export interface MealOptionGroupDTO {
    id: string;
    name: string;
    selectionType: SelectionTypeDTO;
    isRequired?: boolean;
    maxSelections?: number;
    minSelections?: number;
    options: MealOptionDTO[];
}

export interface MealDTO {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price?: number;
    basePrice?: number;
    discountPrice?: number | null;
    calories?: number | null;
    isFeatured?: boolean;
    tags?: string[] | null;
    isAvailable?: boolean;
    optionGroups?: MealOptionGroupDTO[];
}
