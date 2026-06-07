export type OrderStatus =
    | 'PENDING'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY_FOR_PICKUP'
    | 'OUT_FOR_DELIVERY'
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

/** Fulfilment mode chosen at checkout. Mirrors the backend `OrderType` enum. */
export type OrderType = 'delivery' | 'pickup' | 'scheduled';

/** Local UI model for the checkout address form. */
export interface DeliveryAddressInput {
    label?: string;
    addressLine: string;
    city?: string;
    street?: string;
    /** Building name or number — visible on the receipt. */
    building?: string;
    /** Floor / apartment indicator. Kept as a free string so "ground", "2A" etc. work. */
    floor?: string;
    /** Driver-facing notes ("ring the second bell"). */
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
    building?: string;
    floor?: string;
    notes?: string;
}

/**
 * Matches server `CheckoutDto`. `forbidNonWhitelisted` is on, so unknown
 * fields (e.g. `deliveryAddress`) will be rejected with HTTP 400.
 */
export interface CheckoutPayload {
    /** UUID v4; FK to customer_addresses but the column is nullable. */
    addressId: string;
    paymentMethod: PaymentMethod;
    /** Optional — server defaults to 'delivery' for backwards compatibility. */
    orderType?: OrderType;
    /** ISO-8601 datetime. Required only when `orderType === 'scheduled'`. */
    scheduledFor?: string;
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
    /** Server filters on order status (lowercase: pending, confirmed, ...). */
    status?: string;
    /** Free-text search across order number / restaurant name. */
    search?: string;
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

export type DeliveryAcceptance = 'none' | 'pending' | 'accepted' | 'rejected';

export interface OrderDetails {
    orderId: string;
    orderNumber?: string;
    status: OrderStatus | string;
    createdAt: string;
    updatedAt?: string;
    restaurantId?: string;
    restaurantName?: string;
    /**
     * Driver-side acceptance flag. `pending` = customer picked a driver, the
     * driver hasn't accepted yet. `accepted` = driver tapped accept or a
     * manager assigned them. `none` = no driver attached (initial state or
     * after a rejection).
     */
    deliveryAcceptance?: DeliveryAcceptance;
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
    /** Customer rating 1-5 (set after delivery). */
    rating?: number | null;
    ratingComment?: string | null;
    ratedAt?: string | null;
}

export interface ReceiptUrlResponse {
    data: { url: string } | null;
    message?: string | null;
}

export interface OrderDetailsResponse {
    data: OrderDetails;
    message?: string | null;
}
