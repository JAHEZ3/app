import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { RestaurantPaymentInfo } from '../repository/OrderRepository';

export const RESTAURANT_PAYMENT_INFO_KEY = ['restaurant', 'payment-info'] as const;

export const useRestaurantPaymentInfo = (
    restaurantId: string | undefined,
    enabled = true,
) => {
    const { getRestaurantPaymentInfo } = useOrderRepository();
    const isAuthed = useAuthStore((s) => s.status) === 'authenticated';

    return useQuery<RestaurantPaymentInfo, AxiosError>({
        queryKey: [...RESTAURANT_PAYMENT_INFO_KEY, restaurantId],
        queryFn: () => getRestaurantPaymentInfo(restaurantId as string),
        enabled: Boolean(restaurantId) && isAuthed && enabled,
        staleTime: 1000 * 60 * 5,
        retry: 0,
        refetchOnWindowFocus: false,
    });
};
