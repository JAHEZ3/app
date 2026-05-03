import { restaurantApi } from '@/lib/api';
import { RestaurantDetailsDTO, RestaurantsResponseDTO } from '../dto/Restaurant';
import { MenuDTO } from '../dto/Menu';
import { MenuSectionDTO } from '../dto/MenuSection';
import { toRestaurantAdapter } from '../adapter/toRestaurantAdapter';
import { toRestaurantDetailsAdapter } from '../adapter/toRestaurantDetailsAdapter';
import { toMenuAdapter } from '../adapter/toMenuAdapter';
import { toMenuSectionAdapter } from '../adapter/toMenuSectionAdapter';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { Menu } from '../entities/Menu';
import { MenuSection } from '../entities/MenuSection';
import { RestaurantsRepository, RestaurantsPage } from './RestaurantsRepository';

const BASE = '/api/restaurant/mobile/restaurants';
const MENU_BASE = '/api/restaurant/mobile/menus';

export const restRepository = (): RestaurantsRepository => ({
    getRestaurants: async (params): Promise<RestaurantsPage> => {
        const res = await restaurantApi.get<RestaurantsResponseDTO>(BASE, { params });
        return {
            data: (res.data.data ?? []).map(toRestaurantAdapter),
            meta: res.data.meta,
        };
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
});
