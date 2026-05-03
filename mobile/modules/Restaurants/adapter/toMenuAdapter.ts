import { MenuDTO } from '../dto/Menu';
import { Menu } from '../entities/Menu';

const resolveMealCount = (dto: MenuDTO): number => {
    if (typeof dto.mealCount === 'number') return dto.mealCount;
    if (typeof dto.mealsCount === 'number') return dto.mealsCount;
    if (typeof dto.totalMeals === 'number') return dto.totalMeals;
    if (Array.isArray(dto.meals)) return dto.meals.length;
    return 0;
};

export const toMenuAdapter = (dto: MenuDTO): Menu => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    isActive: dto.isActive ?? true,
    mealCount: resolveMealCount(dto),
});
