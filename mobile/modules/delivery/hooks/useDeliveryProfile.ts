import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryProfile = () => {
    const { getProfile } = useDelivery();
    const { accessToken, setLastKnownStatus } = useDeliveryStore();

    const query = useQuery({
        queryKey: ['deliveryProfile'],
        queryFn: async () => {
            console.log('[useDeliveryProfile] Fetching profile, token present:', !!accessToken);
            const profile = await getProfile();
            console.log('[useDeliveryProfile] Response status:', profile?.status);
            return profile;
        },
        enabled: !!accessToken,
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
        refetchOnMount: true,
        refetchOnReconnect: true,
    });

    useEffect(() => {
        if (query.data?.status) {
            console.log('[useDeliveryProfile] Persisting status to SecureStore:', query.data.status);
            SecureStore.setItemAsync('deliveryAgentStatus', query.data.status);
            setLastKnownStatus(query.data.status);
        }
    }, [query.data?.status, setLastKnownStatus]);

    return query;
};
