import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { useAuthStore } from '@/store/useAuthStore';
import { FAVORITES_QUERY_KEY } from './useFavorites';

export const FAVORITE_RESTAURANTS_QUERY_KEY = [...FAVORITES_QUERY_KEY, 'details'] as const;

export const useFavoriteRestaurants = () => {
    const { getFavoriteRestaurants } = useRestaurantsRepository();
    const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');

    return useQuery({
        queryKey: FAVORITE_RESTAURANTS_QUERY_KEY,
        queryFn: getFavoriteRestaurants,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
};
