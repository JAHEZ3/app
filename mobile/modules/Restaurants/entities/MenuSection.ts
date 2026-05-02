import { Meal } from './Meal';

export interface MenuSection {
    id: string;
    name: string;
    meals: Meal[];
}
