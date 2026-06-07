import { useQuery } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const PENDING_ORDERS_QUERY_KEY = ['delivery', 'pendingOrders'] as const;

export const usePendingOrders = () => {
    const { getPendingOrders } = useDelivery();
    const accessToken = useDeliveryStore((s) => s.accessToken);

    return useQuery({
        queryKey: PENDING_ORDERS_QUERY_KEY,
        queryFn: getPendingOrders,
        enabled: !!accessToken,
        staleTime: 1000 * 15,
        refetchInterval: 1000 * 20,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
    });
};
