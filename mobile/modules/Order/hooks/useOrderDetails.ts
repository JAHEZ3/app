import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { OrderDetails } from '../types';

export const ORDER_DETAILS_QUERY_KEY = ['order', 'details'] as const;

export const useOrderDetails = (orderId: string | undefined) => {
    const { getOrderById } = useOrderRepository();
    const status = useAuthStore((s) => s.status);
    const isAuthed = status === 'authenticated';

    return useQuery<OrderDetails, AxiosError>({
        queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId],
        queryFn: () => getOrderById(orderId as string),
        enabled: Boolean(orderId) && isAuthed,
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
    });
};
