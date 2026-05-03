import { Restaurant } from '../entities/Restaurant';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { Menu } from '../entities/Menu';
import { MenuSection } from '../entities/MenuSection';
import { PaginationMeta, RestaurantsQueryParams } from '../types';

export interface RestaurantsPage {
    data: Restaurant[];
    meta: PaginationMeta;
}

export interface RestaurantsRepository {
    getRestaurants: (params?: RestaurantsQueryParams) => Promise<RestaurantsPage>;
    getRestaurantById: (id: string) => Promise<RestaurantDetails>;
    getRestaurantMenus: (restaurantId: string) => Promise<Menu[]>;
    getMenuSections: (restaurantId: string, menuId: string) => Promise<MenuSection[]>;
}
