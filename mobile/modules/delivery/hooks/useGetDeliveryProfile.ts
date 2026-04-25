import { useQuery } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useGetDeliveryProfile = () => {
    const { getProfile } = useDelivery();
    const { accessToken } = useDeliveryStore();

    return useQuery({
        queryKey: ['deliveryProfile'],
        queryFn: getProfile,
        enabled: !!accessToken,
        staleTime: 1000 * 60 * 2,
        retry: 1,
    });
};
