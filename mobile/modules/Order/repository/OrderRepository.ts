import type {
    CheckoutOrder,
    CheckoutPayload,
    OrderDetails,
    OrderListItem,
    OrderRating,
    OrdersPaginationMeta,
    OrdersQueryParams,
    PromoValidatePayload,
    PromoValidationResult,
    RateOrderPayload,
} from '../types';

export interface OrdersPage {
    data: OrderListItem[];
    meta: OrdersPaginationMeta;
}

export interface OrderRepository {
    checkout: (payload: CheckoutPayload, idempotencyKey: string) => Promise<CheckoutOrder>;
    validatePromo: (payload: PromoValidatePayload) => Promise<PromoValidationResult>;
    getOrders: (params?: OrdersQueryParams) => Promise<OrdersPage>;
    getOrderById: (id: string) => Promise<OrderDetails>;
    getReceiptUrl: (id: string) => Promise<string | null>;
    rateOrder: (id: string, payload: RateOrderPayload) => Promise<OrderRating>;
}
