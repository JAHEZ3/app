import { Restaurant } from '../entities/Restaurant';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { Category } from '../entities/Category';
import { Menu } from '../entities/Menu';
import { MenuSection } from '../entities/MenuSection';
import { Meal } from '../entities/Meal';
import { PaginationMeta, RestaurantsQueryParams } from '../types';

export interface RestaurantsPage {
    data: Restaurant[];
    meta: PaginationMeta;
}

export interface RestaurantRatingPayload {
    rating: number;
    comment?: string;
}

export interface RestaurantsRepository {
    getRestaurants: (params?: RestaurantsQueryParams) => Promise<RestaurantsPage>;
    getCategories: () => Promise<Category[]>;
    getRestaurantById: (id: string) => Promise<RestaurantDetails>;
    getRestaurantMenus: (restaurantId: string) => Promise<Menu[]>;
    getMenuSections: (restaurantId: string, menuId: string) => Promise<MenuSection[]>;
    /** All available meals across every menu of a restaurant (flattened). */
    getRestaurantMeals: (restaurantId: string) => Promise<Meal[]>;
    rateRestaurant: (id: string, payload: RestaurantRatingPayload) => Promise<void>;
    getFavorites: () => Promise<string[]>;
    getFavoriteRestaurants: () => Promise<Restaurant[]>;
    addFavorite: (restaurantId: string) => Promise<void>;
    removeFavorite: (restaurantId: string) => Promise<void>;
}
