import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { OrderListItem } from '../types';
import type { OrdersPage } from '../repository/OrderRepository';

const DEFAULT_LIMIT = 10;

export const ORDERS_QUERY_KEY = ['orders'] as const;

interface ApiErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

export const getOrdersErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    if (err.code === 'ECONNABORTED') return 'انتهت مهلة الاتصال — تحقق من الشبكة';
    if (err.code === 'ERR_NETWORK') return 'تعذر الاتصال بالخادم';
    return err.message;
};

interface UseOrdersOptions {
    limit?: number;
    enabled?: boolean;
}

export const useOrders = (options: UseOrdersOptions = {}) => {
    const { limit = DEFAULT_LIMIT, enabled = true } = options;
    const { getOrders } = useOrderRepository();
    const queryClient = useQueryClient();
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
        retry: 1,
    });

    const orders = useMemo<OrderListItem[]>(
        () => query.data?.pages.flatMap((p) => p.data) ?? [],
        [query.data],
    );

    const total = query.data?.pages[0]?.meta?.total ?? 0;
    const loadedPages = query.data?.pages.length ?? 0;

    const loadMore = useCallback(() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
        }
    }, [query]);

    const refresh = useCallback(() => query.refetch(), [query]);

    const invalidate = useCallback(
        () => queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
        [queryClient],
    );

    return {
        ...query,
        orders,
        total,
        loadedPages,
        loadMore,
        refresh,
        invalidate,
    };
};
