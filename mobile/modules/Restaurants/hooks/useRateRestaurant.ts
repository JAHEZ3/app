import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRestaurantsRepository } from '..';
import type {
    RateRestaurantPayload,
    RateRestaurantResult,
} from '../repository/RestaurantsRepository';
import { RestaurantDetails } from '../entities/RestaurantDetails';
import { RESTAURANT_DETAILS_QUERY_KEY } from './useRestaurantDetails';
import { MY_RESTAURANT_RATING_QUERY_KEY } from './useMyRestaurantRating';

interface Variables extends RateRestaurantPayload {
    restaurantId: string;
}

interface ApiErrorPayload {
    message?: string | string[];
}

/** First human-readable message from a NestJS validation/error response. */
export const getRateErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const raw = (err.response?.data as ApiErrorPayload | undefined)?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

/**
 * Submit (or update) the caller's rating for a restaurant.
 *
 * On success the server returns the fresh aggregate, so we patch the restaurant
 * details cache in place — the stars + count update instantly without a refetch
 * — then invalidate list views and the "my rating" cache to stay in sync.
 */
export const useRateRestaurant = () => {
    const { rateRestaurant } = useRestaurantsRepository();
    const queryClient = useQueryClient();

    return useMutation<RateRestaurantResult, AxiosError, Variables>({
        mutationFn: ({ restaurantId, rating, comment }) =>
            rateRestaurant(restaurantId, { rating, comment }),
        retry: 0,
        onSuccess: (result, { restaurantId, comment }) => {
            // Patch the details cache with the recomputed aggregate.
            queryClient.setQueryData<RestaurantDetails>(
                [RESTAURANT_DETAILS_QUERY_KEY, restaurantId],
                (prev) =>
                    prev
                        ? {
                              ...prev,
                              rating: result.aggregate.rating,
                              totalRatings: result.aggregate.totalRatings,
                          }
                        : prev,
            );
            // Reflect the caller's own rating immediately.
            queryClient.setQueryData(
                [MY_RESTAURANT_RATING_QUERY_KEY, restaurantId],
                { rating: result.rating, comment: comment ?? null },
            );
            // Listings show the aggregate too — refresh them in the background.
            queryClient.invalidateQueries({ queryKey: ['restaurants'] });
        },
    });
};
