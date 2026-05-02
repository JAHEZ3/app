import { MealDTO, MealOptionDTO, MealOptionGroupDTO } from '../dto/Meal';
import { Meal, MealOption, MealOptionGroup, SelectionType } from '../entities/Meal';

const toSelectionType = (value: string): SelectionType =>
    value?.toString().toLowerCase() === 'multiple' ? 'multiple' : 'single';

const toMealOption = (dto: MealOptionDTO): MealOption => ({
    id: dto.id,
    name: dto.name,
    extraPrice: Number(dto.extraPrice ?? dto.price ?? 0),
    isAvailable: dto.isAvailable ?? true,
});

const toMealOptionGroup = (dto: MealOptionGroupDTO): MealOptionGroup => {
    const selectionType = toSelectionType(dto.selectionType);
    const isRequired = Boolean(dto.isRequired);
    const minSelections = dto.minSelections ?? (isRequired ? 1 : 0);
    const maxSelections =
        dto.maxSelections ?? (selectionType === 'single' ? 1 : dto.options?.length ?? 1);

    return {
        id: dto.id,
        name: dto.name,
        selectionType,
        isRequired,
        minSelections,
        maxSelections,
        options: (dto.options ?? []).map(toMealOption),
    };
};

export const toMealAdapter = (dto: MealDTO): Meal => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    imageUrl: dto.imageUrl,
    price: Number(dto.discountPrice ?? dto.price ?? dto.basePrice ?? 0),
    basePrice: dto.basePrice != null ? Number(dto.basePrice) : undefined,
    discountPrice: dto.discountPrice != null ? Number(dto.discountPrice) : undefined,
    calories: dto.calories != null ? Number(dto.calories) : undefined,
    isFeatured: Boolean(dto.isFeatured),
    tags: dto.tags ?? undefined,
    isAvailable: dto.isAvailable ?? true,
    optionGroups: (dto.optionGroups ?? []).map(toMealOptionGroup),
});
