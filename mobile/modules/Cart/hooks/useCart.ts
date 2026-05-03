import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartRepository } from '..';
import type { Cart } from '../types';
import { CART_QUERY_KEY } from './useAddToCart';

export const useCart = () => {
    const { getCart } = useCartRepository();
    const status = useAuthStore((s) => s.status);
    const isAuthed = status === 'authenticated';

    return useQuery<Cart | null, AxiosError>({
        queryKey: CART_QUERY_KEY,
        queryFn: getCart,
        enabled: isAuthed,
        retry: 1,
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};
