import { AxiosError } from 'axios';
import { orderApi } from '@/lib/api';
import type {
    CheckoutOrder,
    CheckoutResponse,
    OrderDetails,
    OrderDetailsResponse,
    OrdersListResponse,
    OrdersPaginationMeta,
} from '../types';
import { OrderRepository, OrdersPage } from './OrderRepository';

const CHECKOUT_URL = '/api/order/checkout';
const ORDERS_URL = '/api/order/orders';

const DEFAULT_META = (page: number, limit: number, count: number): OrdersPaginationMeta => ({
    total: count,
    page,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: page > 1,
});

const logError = (label: string, err: unknown) => {
    if (err instanceof AxiosError) {
        console.log(`[order] ✗ ${label}`, {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
            code: err.code,
            url: err.config?.url,
        });
    } else {
        console.log(`[order] ✗ ${label} (non-axios)`, err);
    }
};

export const restRepository = (): OrderRepository => ({
    checkout: async (idempotencyKey): Promise<CheckoutOrder> => {
        console.log(`[order] → POST ${CHECKOUT_URL}`, { idempotencyKey });
        try {
            const res = await orderApi.post<CheckoutResponse>(
                CHECKOUT_URL,
                {},
                { headers: { 'Idempotency-Key': idempotencyKey } },
            );
            console.log('[order] ← POST checkout response', res.data);
            return res.data.data;
        } catch (err) {
            logError('checkout', err);
            throw err;
        }
    },

    getOrders: async (params): Promise<OrdersPage> => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;
        console.log(`[order] → GET ${ORDERS_URL}`, { page, limit });
        try {
            const res = await orderApi.get<OrdersListResponse>(ORDERS_URL, {
                params: { page, limit },
            });
            console.log('[order] ← GET orders response', res.data);
            const data = res.data.data ?? [];
            const meta = res.data.meta ?? DEFAULT_META(page, limit, data.length);
            return { data, meta };
        } catch (err) {
            logError('getOrders', err);
            throw err;
        }
    },

    getOrderById: async (id): Promise<OrderDetails> => {
        const url = `${ORDERS_URL}/${id}`;
        console.log(`[order] → GET ${url}`);
        try {
            const res = await orderApi.get<OrderDetailsResponse>(url);
            console.log('[order] ← GET order details response', res.data);
            return res.data.data;
        } catch (err) {
            logError('getOrderById', err);
            throw err;
        }
    },
});
