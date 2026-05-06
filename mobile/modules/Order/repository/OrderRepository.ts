import type {
    CheckoutOrder,
    OrderDetails,
    OrderListItem,
    OrdersPaginationMeta,
    OrdersQueryParams,
} from '../types';

export interface OrdersPage {
    data: OrderListItem[];
    meta: OrdersPaginationMeta;
}

export interface OrderRepository {
    checkout: (idempotencyKey: string) => Promise<CheckoutOrder>;
    getOrders: (params?: OrdersQueryParams) => Promise<OrdersPage>;
    getOrderById: (id: string) => Promise<OrderDetails>;
}
