import { CategoryDTO } from '../dto/Category';
import { Category } from '../entities/Category';

export const toCategoryAdapter = (dto: CategoryDTO): Category => ({
  id: dto.id,
  name: dto.name,
  iconUrl: dto.iconUrl ?? null,
});
