import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { MenuSection } from '../entities/MenuSection';

export const MENU_SECTIONS_QUERY_KEY = 'menuSections';

export const useMenuSections = (
    restaurantId: string | undefined,
    menuId: string | undefined,
) => {
    const { getMenuSections } = useRestaurantsRepository();

    return useQuery<MenuSection[], Error>({
        queryKey: [MENU_SECTIONS_QUERY_KEY, restaurantId, menuId],
        queryFn: () => getMenuSections(restaurantId as string, menuId as string),
        enabled: Boolean(restaurantId) && Boolean(menuId),
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });
};
