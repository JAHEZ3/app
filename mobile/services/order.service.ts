import { AxiosError } from 'axios';
import { orderApi } from '@/lib/api';
import type {
    CheckoutOrder,
    CheckoutPayload,
    CheckoutResponse,
    OrderDetails,
    OrderDetailsResponse,
    OrderListItem,
    OrderRating,
    OrdersListResponse,
    OrdersPaginationMeta,
    OrdersQueryParams,
    PromoValidatePayload,
    PromoValidateResponse,
    PromoValidationResult,
    RateOrderPayload,
    RateOrderResponse,
} from '@/modules/Order/types';

const CHECKOUT_URL = '/api/order/checkout';
const PROMO_VALIDATE_URL = '/api/order/promo/validate';
const ORDERS_URL = '/api/order/orders';

export interface OrdersPageResult {
    data: OrderListItem[];
    meta: OrdersPaginationMeta;
}

const defaultMeta = (
    page: number,
    limit: number,
    count: number,
): OrdersPaginationMeta => ({
    total: count,
    page,
    limit,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: page > 1,
});

export interface OrderServiceErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

export const extractApiMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as OrderServiceErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export const OrderService = {
    checkout: async (
        payload: CheckoutPayload,
        idempotencyKey: string,
    ): Promise<CheckoutOrder> => {
        const res = await orderApi.post<CheckoutResponse>(CHECKOUT_URL, payload, {
            headers: { 'Idempotency-Key': idempotencyKey },
        });
        return res.data.data;
    },

    validatePromo: async (
        payload: PromoValidatePayload,
    ): Promise<PromoValidationResult> => {
        const res = await orderApi.post<PromoValidateResponse>(PROMO_VALIDATE_URL, payload);
        return res.data.data;
    },

    getOrders: async (params: OrdersQueryParams = {}): Promise<OrdersPageResult> => {
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const res = await orderApi.get<OrdersListResponse>(ORDERS_URL, {
            params: { page, limit },
        });
        const data = res.data.data ?? [];
        const meta = res.data.meta ?? defaultMeta(page, limit, data.length);
        return { data, meta };
    },

    getOrderById: async (id: string): Promise<OrderDetails> => {
        const res = await orderApi.get<OrderDetailsResponse>(`${ORDERS_URL}/${id}`);
        return res.data.data;
    },

    getReceiptUrl: async (id: string): Promise<string | null> => {
        const res = await orderApi.get<{ data: { url: string } | null; message?: string | null }>(
            `${ORDERS_URL}/${id}/receipt`,
        );
        return res.data?.data?.url ?? null;
    },

    rateOrder: async (
        id: string,
        payload: RateOrderPayload,
    ): Promise<OrderRating> => {
        const res = await orderApi.post<RateOrderResponse>(
            `${ORDERS_URL}/${id}/rate`,
            payload,
        );
        return res.data.data;
    },
};

export default OrderService;
