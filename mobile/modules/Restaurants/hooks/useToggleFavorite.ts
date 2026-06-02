import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRestaurantsRepository } from '..';
import { FAVORITES_QUERY_KEY } from './useFavorites';

export const useToggleFavorite = () => {
    const { addFavorite, removeFavorite } = useRestaurantsRepository();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            restaurantId,
            isFavorite,
        }: {
            restaurantId: string;
            isFavorite: boolean;
        }) =>
            isFavorite ? removeFavorite(restaurantId) : addFavorite(restaurantId),

        onMutate: async ({ restaurantId, isFavorite }) => {
            await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
            const prev = queryClient.getQueryData<string[]>(FAVORITES_QUERY_KEY);
            queryClient.setQueryData<string[]>(FAVORITES_QUERY_KEY, (old = []) =>
                isFavorite
                    ? old.filter((id) => id !== restaurantId)
                    : [...old, restaurantId],
            );
            return { prev };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(FAVORITES_QUERY_KEY, ctx.prev);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
        },
    });
};
