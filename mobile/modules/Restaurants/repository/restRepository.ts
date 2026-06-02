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

const toId = (item: unknown): string | null => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const id = o.id ?? o.restaurantId ?? o.restaurant_id;
        return typeof id === 'string' ? id : null;
    }
    return null;
};

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

    rateRestaurant: async (id, payload) => {
        await restaurantApi.post(`${BASE}/${id}/rate`, payload);
    },

    getFavorites: async (): Promise<string[]> => {
        try {
            const res = await restaurantApi.get<{ data: unknown }>(`${BASE}/favorites`);
            const raw = res.data?.data ?? res.data;
            if (Array.isArray(raw)) {
                return raw.map(toId).filter((id): id is string => id !== null);
            }
            return [];
        } catch (err: any) {
            if (err?.response?.status === 404) return [];
            throw err;
        }
    },

    getFavoriteRestaurants: async () => {
        try {
            const res = await restaurantApi.get<{ data: unknown }>(`${BASE}/favorites`);
            const raw = res.data?.data ?? res.data;
            if (!Array.isArray(raw)) return [];
            // Server may return full objects or just IDs. Map whichever shape we get.
            return raw
                .filter((item) => item && typeof item === 'object' && 'name' in item)
                .map(toRestaurantAdapter);
        } catch (err: any) {
            if (err?.response?.status === 404) return [];
            throw err;
        }
    },

    addFavorite: async (restaurantId) => {
        await restaurantApi.post(`${BASE}/${restaurantId}/favorite`);
    },

    removeFavorite: async (restaurantId) => {
        await restaurantApi.delete(`${BASE}/${restaurantId}/favorite`);
    },
});
