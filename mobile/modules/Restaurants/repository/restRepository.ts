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

    getMenuSections: async (restaurantId, menuId): Promise<MenuSection[]> => {
        const res = await restaurantApi.get<{ data: MenuSectionDTO[] }>(
            `${BASE}/${restaurantId}/menus/${menuId}/sections`,
        );
        return (res.data.data ?? []).map(toMenuSectionAdapter);
    },
});
