import { MenuSectionDTO } from '../dto/MenuSection';
import { MenuSection } from '../entities/MenuSection';
import { toMealAdapter } from './toMealAdapter';

export const toMenuSectionAdapter = (dto: MenuSectionDTO): MenuSection => ({
    id: dto.id,
    name: dto.name,
    meals: (dto.meals ?? []).map(toMealAdapter),
});
