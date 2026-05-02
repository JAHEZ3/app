import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { Menu } from '../entities/Menu';

export const RESTAURANT_MENUS_QUERY_KEY = 'restaurantMenus';

interface UseRestaurantMenusResult {
    menus: Menu[];
    selectedMenuId: string | null;
    selectedMenu: Menu | null;
    selectMenu: (id: string) => void;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
}

export const useRestaurantMenus = (
    restaurantId: string | undefined,
): UseRestaurantMenusResult => {
    const { getRestaurantMenus } = useRestaurantsRepository();
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

    const query = useQuery<Menu[], Error>({
        queryKey: [RESTAURANT_MENUS_QUERY_KEY, restaurantId],
        queryFn: () => getRestaurantMenus(restaurantId as string),
        enabled: Boolean(restaurantId),
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });

    const menus = query.data ?? [];

    useEffect(() => {
        if (!menus.length) {
            if (selectedMenuId !== null) setSelectedMenuId(null);
            return;
        }
        const stillExists = menus.some((m) => m.id === selectedMenuId);
        if (!stillExists) {
            setSelectedMenuId(menus[0].id);
        }
    }, [menus, selectedMenuId]);

    const selectMenu = useCallback((id: string) => setSelectedMenuId(id), []);

    const selectedMenu = menus.find((m) => m.id === selectedMenuId) ?? null;

    return {
        menus,
        selectedMenuId,
        selectedMenu,
        selectMenu,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error ?? null,
        refetch: query.refetch,
    };
};
