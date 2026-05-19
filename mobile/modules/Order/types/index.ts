export type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'ON_THE_WAY'
    | 'DELIVERED'
    | 'CANCELLED';

export interface OrderItemPreview {
    mealId?: string;
    mealName: string;
    mealImage?: string;
    quantity?: number;
}

export interface OrderListItem {
    orderId: string;
    orderNumber?: string;
    status: OrderStatus | string;
    restaurantId?: string;
    restaurantName?: string;
    restaurantImage?: string;
    itemCount?: number;
    items?: OrderItemPreview[];
    total: number;
    createdAt: string;
}

export type PaymentMethod = 'cash_on_delivery' | 'card' | 'online';

/** Local UI model for the checkout address form. */
export interface DeliveryAddressInput {
    label?: string;
    addressLine: string;
    city?: string;
    street?: string;
    building?: string;
    apartment?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
}

/** Mirrors `delivery_address_snapshot` JSONB column in the backend. */
export interface AddressSnapshot {
    street: string;
    city: string;
    lat: number;
    lng: number;
    label?: string;
}

/**
 * Matches server `CheckoutDto`. `forbidNonWhitelisted` is on, so unknown
 * fields (e.g. `deliveryAddress`) will be rejected with HTTP 400.
 */
export interface CheckoutPayload {
    /** UUID v4; FK to customer_addresses but the column is nullable. */
    addressId: string;
    paymentMethod: PaymentMethod;
    addressSnapshot?: AddressSnapshot;
    customerNotes?: string;
    promoCode?: string;
    deliveryFee?: number;
    customerName?: string;
    customerPhone?: string;
    restaurantName?: string;
    ownerUserId?: string;
}

export interface CheckoutOrder {
    /** Backend Order entity uses `id`. We keep `orderId` as an alias. */
    id?: string;
    orderId?: string;
    orderNumber?: string;
    status: string;
    /** Backend uses `totalAmount`; we surface it as `total` in the UI layer. */
    total?: number;
    totalAmount?: number;
    subtotal?: number;
    deliveryFee?: number;
    discount?: number;
    discountAmount?: number;
    paymentMethod?: PaymentMethod | string;
    paymentStatus?: string;
    estimatedDeliveryTime?: string;
    [key: string]: unknown;
}

export interface CheckoutResponse {
    data: CheckoutOrder;
    message: string | null;
}

export interface PromoValidatePayload {
    code: string;
    subtotal?: number;
}

export interface PromoValidationResult {
    code: string;
    discount: number;
    finalAmount: number;
    discountType?: 'percentage' | 'fixed' | string;
    isValid: boolean;
    message?: string | null;
}

export interface PromoValidateResponse {
    data: PromoValidationResult;
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
    orderNumber?: string;
    status: OrderStatus | string;
    createdAt: string;
    updatedAt?: string;
    restaurantId?: string;
    restaurantName?: string;
    items: OrderItem[];
    subtotal: number;
    deliveryFee?: number;
    discount?: number;
    total: number;
    paymentMethod?: PaymentMethod | string;
    paymentStatus?: 'unpaid' | 'paid' | 'refunded' | string;
    customerNotes?: string;
    statusHistory?: OrderStatusHistoryEntry[];
    delivery?: OrderDeliveryInfo;
    /** Truthy when the receipt has been generated and is downloadable. */
    hasReceipt?: boolean;
    /** Local flag — set after a successful rating submission to hide the CTA. */
    hasRating?: boolean;
    rating?: OrderRating;
}

export interface ReceiptUrlResponse {
    data: { url: string } | null;
    message?: string | null;
}

export interface RateOrderPayload {
    foodRating: number;
    deliveryRating: number;
    comment?: string;
}

export interface OrderRating {
    id?: string;
    orderId?: string;
    customerId?: string;
    foodRating: number;
    deliveryRating: number;
    comment?: string;
    createdAt?: string;
}

export interface RateOrderResponse {
    data: OrderRating;
    message?: string | null;
}

export interface OrderDetailsResponse {
    data: OrderDetails;
    message?: string | null;
}
