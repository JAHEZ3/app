import { useQuery } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';

export const CATEGORIES_QUERY_KEY = 'restaurantCategories';

export const useCategories = () => {
  const { getCategories } = useRestaurantsRepository();

  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};
