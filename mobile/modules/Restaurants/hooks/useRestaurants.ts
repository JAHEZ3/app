import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { Restaurant } from '../entities/Restaurant';
import { RestaurantsQueryParams } from '../types';
import { RestaurantsPage } from '../repository/RestaurantsRepository';

const DEFAULT_LIMIT = 10;

export const RESTAURANTS_QUERY_KEY = 'restaurants';

export interface UseRestaurantsOptions extends Omit<RestaurantsQueryParams, 'page'> {
    enabled?: boolean;
}

export const useRestaurants = (options: UseRestaurantsOptions = {}) => {
    const { enabled = true, limit = DEFAULT_LIMIT, ...filters } = options;
    const { getRestaurants } = useRestaurantsRepository();

    const query = useInfiniteQuery<RestaurantsPage, Error>({
        queryKey: [RESTAURANTS_QUERY_KEY, { limit, ...filters }],
        queryFn: ({ pageParam }) =>
            getRestaurants({ page: pageParam as number, limit, ...filters }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.meta?.hasNextPage ? lastPage.meta.page + 1 : undefined,
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
        enabled,
    });

    const restaurants = useMemo<Restaurant[]>(
        () => query.data?.pages.flatMap((p) => p.data) ?? [],
        [query.data],
    );

    const total = query.data?.pages[0]?.meta?.total ?? 0;

    return {
        ...query,
        restaurants,
        total,
    };
};
