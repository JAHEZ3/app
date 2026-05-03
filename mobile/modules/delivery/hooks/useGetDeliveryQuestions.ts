import { useQuery } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useGetDeliveryQuestions = () => {
    const { getQuestions } = useDelivery();
    const { accessToken } = useDeliveryStore();

    return useQuery({
        queryKey: ['deliveryQuestions'],
        queryFn: getQuestions,
        enabled: !!accessToken,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24,
    });
};
