import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useSubmitDeliveryProfile = () => {
    const { submitProfile } = useDelivery();
    const queryClient = useQueryClient();
    const { setLastKnownStatus } = useDeliveryStore();

    return useMutation({
        mutationKey: ['delivery/submitProfile'],
        mutationFn: submitProfile,
        onSuccess: async () => {
            // Persist status so useDeliveryInit can restore it on next app open
            await SecureStore.setItemAsync('deliveryAgentStatus', 'PENDING_APPROVAL');
            setLastKnownStatus('PENDING_APPROVAL');
            await queryClient.invalidateQueries({ queryKey: ['deliveryProfile'] });
            router.replace('/delivery/pending' as never);
        },
    });
};
