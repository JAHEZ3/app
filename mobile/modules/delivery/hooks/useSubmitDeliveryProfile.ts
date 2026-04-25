import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDelivery } from '..';

export const useSubmitDeliveryProfile = () => {
    const { submitProfile } = useDelivery();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['delivery/submitProfile'],
        mutationFn: submitProfile,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['deliveryProfile'] });
            router.replace('/delivery/pending' as never);
        },
    });
};
