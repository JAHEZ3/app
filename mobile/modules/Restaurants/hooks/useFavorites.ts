import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { useAuthStore } from '@/store/useAuthStore';

export const FAVORITES_QUERY_KEY = ['restaurants', 'favorites'] as const;

export const useFavorites = () => {
    const { getFavorites } = useRestaurantsRepository();
    const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');

    const query = useQuery({
        queryKey: FAVORITES_QUERY_KEY,
        queryFn: getFavorites,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const isFavorite = (restaurantId: string): boolean =>
        query.data?.includes(restaurantId) ?? false;

    return { ...query, isFavorite };
};
