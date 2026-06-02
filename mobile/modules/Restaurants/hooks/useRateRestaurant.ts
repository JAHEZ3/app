import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';

export const useRateRestaurant = () => {
    const { rateRestaurant } = useRestaurantsRepository();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            restaurantId,
            rating,
            comment,
        }: {
            restaurantId: string;
            rating: number;
            comment?: string;
        }) => rateRestaurant(restaurantId, { rating, comment }),

        onSuccess: (_data, { restaurantId }) => {
            queryClient.invalidateQueries({ queryKey: ['restaurantDetails', restaurantId] });
            queryClient.invalidateQueries({ queryKey: ['restaurants'] });
        },
    });
};
