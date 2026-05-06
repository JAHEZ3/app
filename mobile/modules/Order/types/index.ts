export type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'ON_THE_WAY'
    | 'DELIVERED'
    | 'CANCELLED';

export interface OrderListItem {
    orderId: string;
    status: OrderStatus | string;
    restaurantName?: string;
    itemCount?: number;
    total: number;
    createdAt: string;
}

export interface CheckoutOrder {
    orderId: string;
    status: string;
    total?: number;
    [key: string]: unknown;
}

export interface CheckoutResponse {
    data: CheckoutOrder;
    message: string | null;
}

export interface OrdersPaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface OrdersListResponse {
    data: OrderListItem[];
    meta: OrdersPaginationMeta;
    message?: string | null;
}

export interface OrdersQueryParams {
    page?: number;
    limit?: number;
}

export interface OrderItemOption {
    optionId?: string;
    optionName: string;
    extraPrice?: number;
}

export interface OrderItem {
    mealId: string;
    mealName: string;
    mealImage?: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    specialInstructions?: string;
    options?: OrderItemOption[];
}

export interface OrderStatusHistoryEntry {
    status: OrderStatus | string;
    changedAt: string;
    note?: string;
    actor?: string;
}

export interface OrderDeliveryInfo {
    addressLine?: string;
    address?: string;
    city?: string;
    street?: string;
    notes?: string;
    contactName?: string;
    contactPhone?: string;
    courierName?: string;
    courierPhone?: string;
    estimatedArrival?: string;
    deliveredAt?: string;
    latitude?: number;
    longitude?: number;
}

export interface OrderDetails {
    orderId: string;
    status: OrderStatus | string;
    createdAt: string;
    updatedAt?: string;
    restaurantId?: string;
    restaurantName?: string;
    items: OrderItem[];
    subtotal: number;
    deliveryFee?: number;
    total: number;
    paymentMethod?: string;
    statusHistory?: OrderStatusHistoryEntry[];
    delivery?: OrderDeliveryInfo;
}

export interface OrderDetailsResponse {
    data: OrderDetails;
    message?: string | null;
}
