import { MealDTO } from './Meal';

export interface MenuSectionDTO {
    id: string;
    name: string;
    meals: MealDTO[];
}

export interface MenuSectionsResponseDTO {
    data: MenuSectionDTO[];
}
