import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { useAuthStore } from '@/store/useAuthStore';
import type { MyRestaurantRating } from '../repository/RestaurantsRepository';

export const MY_RESTAURANT_RATING_QUERY_KEY = 'myRestaurantRating';

/**
 * The signed-in customer's own rating for a restaurant (or null). Used to
 * pre-fill the rating dialog and show a "you rated N★" state. Only runs when
 * authenticated — anonymous users have no personal rating.
 */
export const useMyRestaurantRating = (restaurantId: string | undefined) => {
    const { getMyRestaurantRating } = useRestaurantsRepository();
    const isAuthenticated = useAuthStore((s) => s.status === 'authenticated');

    return useQuery<MyRestaurantRating | null, Error>({
        queryKey: [MY_RESTAURANT_RATING_QUERY_KEY, restaurantId],
        queryFn: () => getMyRestaurantRating(restaurantId as string),
        enabled: Boolean(restaurantId) && isAuthenticated,
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });
};
