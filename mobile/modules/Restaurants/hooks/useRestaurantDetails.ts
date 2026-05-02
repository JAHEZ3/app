import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { RestaurantDetails } from '../entities/RestaurantDetails';

export const RESTAURANT_DETAILS_QUERY_KEY = 'restaurantDetails';

export const useRestaurantDetails = (id: string | undefined) => {
    const { getRestaurantById } = useRestaurantsRepository();

    return useQuery<RestaurantDetails, Error>({
        queryKey: [RESTAURANT_DETAILS_QUERY_KEY, id],
        queryFn: () => getRestaurantById(id as string),
        enabled: Boolean(id),
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
        retry: 2,
    });
};
