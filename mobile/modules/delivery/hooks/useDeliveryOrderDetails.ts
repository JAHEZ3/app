import { useQuery } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const ORDER_DETAILS_QUERY_KEY = ['delivery', 'orderDetails'] as const;

/**
 * Full detail for a single order the driver is viewing. Backed by the
 * order-service `GET /orders/:id` (access-guarded to the assigned agent).
 */
export const useDeliveryOrderDetails = (orderId: string | undefined) => {
    const { getOrderDetails } = useDelivery();
    const accessToken = useDeliveryStore((s) => s.accessToken);

    return useQuery({
        queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId ?? ''],
        queryFn: () => getOrderDetails(orderId as string),
        enabled: !!accessToken && !!orderId,
        staleTime: 1000 * 15,
    });
};
