import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { OrderListItem } from '../types';
import { OrdersPage } from '../repository/OrderRepository';

const DEFAULT_LIMIT = 10;

export const ORDERS_QUERY_KEY = ['orders'] as const;

interface UseOrdersOptions {
    limit?: number;
    enabled?: boolean;
}

export const useOrders = (options: UseOrdersOptions = {}) => {
    const { limit = DEFAULT_LIMIT, enabled = true } = options;
    const { getOrders } = useOrderRepository();
    const status = useAuthStore((s) => s.status);
    const isAuthed = status === 'authenticated';

    const query = useInfiniteQuery<OrdersPage, AxiosError>({
        queryKey: [...ORDERS_QUERY_KEY, { limit }],
        queryFn: ({ pageParam }) =>
            getOrders({ page: pageParam as number, limit }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.meta?.hasNextPage ? lastPage.meta.page + 1 : undefined,
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
        enabled: enabled && isAuthed,
    });

    const orders = useMemo<OrderListItem[]>(
        () => query.data?.pages.flatMap((p) => p.data) ?? [],
        [query.data],
    );

    const total = query.data?.pages[0]?.meta?.total ?? 0;

    return {
        ...query,
        orders,
        total,
    };
};
