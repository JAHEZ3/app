import { restaurantApi } from '@/lib/api';
import { RestaurantDetailsDTO, RestaurantsResponseDTO } from '../dto/Restaurant';
import { MenuDTO } from '../dto/Menu';
import { MenuSectionDTO } from '../dto/MenuSection';
import { toRestaurantAdapter } from '../adapter/toRestaurantAdapter';
import { toCategoryAdapter } from '../adapter/toCategoryAdapter';
import { CategoryDTO } from '../dto/Category';
import { toRestaurantDetailsAdapter } from '../adapter/toRestaurantDetailsAdapter';
import { toMenuAdapter } from '../adapter/toMenuAdapter';
import { toMenuSectionAdapter } from '../adapter/toMenuSectionAdapter';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { Category } from '../entities/Category';
import { Menu } from '../entities/Menu';
import { MenuSection } from '../entities/MenuSection';
import { Meal } from '../entities/Meal';
import { RestaurantsRepository, RestaurantsPage } from './RestaurantsRepository';

const BASE = '/api/restaurant/mobile/restaurants';
const MENU_BASE = '/api/restaurant/mobile/menus';
const CATEGORIES_BASE = '/api/restaurant/categories';

export const restRepository = (): RestaurantsRepository => ({
    getRestaurants: async (params): Promise<RestaurantsPage> => {
        const res = await restaurantApi.get<RestaurantsResponseDTO>(BASE, { params });
        return {
            data: (res.data.data ?? []).map(toRestaurantAdapter),
            meta: res.data.meta,
        };
    },

    getCategories: async (): Promise<Category[]> => {
        // The endpoint returns a bare array; tolerate a `{ data }` wrapper too.
        const res = await restaurantApi.get<CategoryDTO[] | { data: CategoryDTO[] }>(CATEGORIES_BASE);
        const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        return raw.map(toCategoryAdapter);
    },

    getRestaurantById: async (id): Promise<RestaurantDetails> => {
        const res = await restaurantApi.get<{ data: RestaurantDetailsDTO }>(`${BASE}/${id}`);
        return toRestaurantDetailsAdapter(res.data.data);
    },

    getRestaurantMenus: async (restaurantId): Promise<Menu[]> => {
        const res = await restaurantApi.get<{ data: MenuDTO[] }>(`${BASE}/${restaurantId}/menus`);
        return (res.data.data ?? []).map(toMenuAdapter);
    },

    getMenuSections: async (_restaurantId, menuId): Promise<MenuSection[]> => {
        const res = await restaurantApi.get<{ data: { sections?: MenuSectionDTO[] } | MenuSectionDTO[] }>(
            `${MENU_BASE}/${menuId}`,
        );
        const payload = res.data.data;
        const sections = Array.isArray(payload) ? payload : payload.sections ?? [];
        return sections.map(toMenuSectionAdapter);
    },

    getRestaurantMeals: async (restaurantId): Promise<Meal[]> => {
        // Two-step: list the restaurant's menus, then fetch each menu's sections
        // (which carry the meals) in parallel and flatten. Available meals only.
        const menusRes = await restaurantApi.get<{ data: MenuDTO[] }>(
            `${BASE}/${restaurantId}/menus`,
        );
        const menus = (menusRes.data.data ?? []).map(toMenuAdapter);
        if (!menus.length) return [];

        const menuPayloads = await Promise.all(
            menus.map((menu) =>
                restaurantApi
                    .get<{ data: { sections?: MenuSectionDTO[] } | MenuSectionDTO[] }>(
                        `${MENU_BASE}/${menu.id}`,
                    )
                    .then((res) => res.data.data)
                    .catch(() => [] as MenuSectionDTO[]),
            ),
        );

        return menuPayloads.flatMap((payload) => {
            const sections = Array.isArray(payload) ? payload : payload?.sections ?? [];
            return sections
                .map(toMenuSectionAdapter)
                .flatMap((section) => section.meals)
                .filter((meal) => meal.isAvailable);
        });
    },
});
