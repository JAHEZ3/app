import type {
    OrderDeliveryInfo,
    OrderDetails,
    OrderItem,
    OrderItemOption,
    OrderItemPreview,
    OrderListItem,
    OrderStatus,
    OrderStatusHistoryEntry,
} from '../types';

/**
 * Raw shape returned by the backend `GET /api/order/orders/:id` endpoint.
 * The backend currently serializes the TypeORM entity directly, so we are
 * defensive about both camelCase and snake_case keys.
 */
interface RawOrder {
    id?: string;
    orderId?: string;
    orderNumber?: string;
    order_number?: string;
    status?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    restaurantId?: string;
    restaurant_id?: string;
    restaurantNameSnapshot?: string;
    restaurant_name_snapshot?: string;
    restaurantName?: string;
    subtotal?: number | string;
    totalAmount?: number | string;
    total_amount?: number | string;
    total?: number | string;
    deliveryFee?: number | string;
    delivery_fee?: number | string;
    discountAmount?: number | string;
    discount_amount?: number | string;
    paymentMethod?: string;
    payment_method?: string;
    paymentStatus?: string;
    payment_status?: string;
    customerNotes?: string;
    customer_notes?: string;
    receiptKey?: string | null;
    receipt_key?: string | null;
    rating?: number | null;
    ratingComment?: string | null;
    rating_comment?: string | null;
    ratedAt?: string | null;
    rated_at?: string | null;
    deliveryAddressSnapshot?: {
        street?: string;
        city?: string;
        lat?: number;
        lng?: number;
        label?: string;
        notes?: string;
    } | null;
    delivery_address_snapshot?: RawOrder['deliveryAddressSnapshot'];
    estimatedDeliveryAt?: string;
    estimated_delivery_at?: string;
    deliveredAt?: string;
    delivered_at?: string;
    customerNameSnapshot?: string;
    customer_name_snapshot?: string;
    customerPhoneSnapshot?: string;
    customer_phone_snapshot?: string;
    items?: RawOrderItem[];
    statusHistory?: RawStatusHistory[];
    status_history?: RawStatusHistory[];
    courierName?: string;
    courier_name?: string;
    courierPhone?: string;
    courier_phone?: string;
}

interface RawOrderItem {
    id?: string;
    mealId?: string;
    meal_id?: string;
    mealNameSnapshot?: string;
    meal_name_snapshot?: string;
    mealName?: string;
    mealImage?: string;
    meal_image?: string;
    unitPriceSnapshot?: number | string;
    unit_price_snapshot?: number | string;
    unitPrice?: number | string;
    quantity?: number | string;
    totalPrice?: number | string;
    total_price?: number | string;
    specialInstructions?: string;
    special_instructions?: string;
    options?: RawOrderItemOption[];
}

interface RawOrderItemOption {
    id?: string;
    optionId?: string;
    option_id?: string;
    optionName?: string;
    option_name_snapshot?: string;
    optionNameSnapshot?: string;
    extraPrice?: number | string;
    extra_price?: number | string;
    extra_price_snapshot?: number | string;
}

interface RawStatusHistory {
    status?: string;
    createdAt?: string;
    created_at?: string;
    changedAt?: string;
    note?: string | null;
    actor?: string;
    changedByUserId?: string;
}

const toNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : fallback;
};

const pick = <T,>(...values: (T | undefined | null)[]): T | undefined => {
    for (const v of values) {
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
};

const STATUS_NORMALIZE: Record<string, OrderStatus> = {
    pending: 'PENDING',
    PENDING: 'PENDING',
    confirmed: 'CONFIRMED',
    CONFIRMED: 'CONFIRMED',
    preparing: 'PREPARING',
    PREPARING: 'PREPARING',
    ready_for_pickup: 'READY_FOR_PICKUP',
    READY_FOR_PICKUP: 'READY_FOR_PICKUP',
    out_for_delivery: 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    on_the_way: 'OUT_FOR_DELIVERY',
    ON_THE_WAY: 'OUT_FOR_DELIVERY',
    delivered: 'DELIVERED',
    DELIVERED: 'DELIVERED',
    cancelled: 'CANCELLED',
    CANCELLED: 'CANCELLED',
    refunded: 'CANCELLED',
    REFUNDED: 'CANCELLED',
};

export const normalizeStatus = (raw: string | undefined): OrderStatus => {
    if (!raw) return 'PENDING';
    return STATUS_NORMALIZE[raw] ?? (raw.toUpperCase() as OrderStatus);
};

const adaptOption = (raw: RawOrderItemOption): OrderItemOption => ({
    optionId: pick(raw.optionId, raw.option_id, raw.id),
    optionName:
        pick(raw.optionName, raw.optionNameSnapshot, raw.option_name_snapshot) ?? '',
    extraPrice: toNumber(
        pick(raw.extraPrice, raw.extra_price, raw.extra_price_snapshot),
        0,
    ),
});

const adaptItem = (raw: RawOrderItem): OrderItem => {
    const unitPrice = toNumber(
        pick(raw.unitPrice, raw.unitPriceSnapshot, raw.unit_price_snapshot),
        0,
    );
    const quantity = toNumber(raw.quantity, 1);
    const totalPriceCandidate = pick(raw.totalPrice, raw.total_price);
    const totalPrice =
        totalPriceCandidate !== undefined
            ? toNumber(totalPriceCandidate)
            : unitPrice * quantity;

    return {
        mealId: pick(raw.mealId, raw.meal_id) ?? '',
        mealName: pick(raw.mealName, raw.mealNameSnapshot, raw.meal_name_snapshot) ?? '',
        mealImage: pick(raw.mealImage, raw.meal_image),
        unitPrice,
        quantity,
        totalPrice,
        specialInstructions: pick(raw.specialInstructions, raw.special_instructions),
        options: raw.options?.map(adaptOption),
    };
};

const adaptStatusHistory = (raw: RawStatusHistory): OrderStatusHistoryEntry => ({
    status: normalizeStatus(raw.status),
    changedAt:
        pick(raw.changedAt, raw.createdAt, raw.created_at) ?? new Date().toISOString(),
    note: raw.note ?? undefined,
    actor: pick(raw.actor, raw.changedByUserId),
});

const adaptDelivery = (raw: RawOrder): OrderDeliveryInfo | undefined => {
    const snap = raw.deliveryAddressSnapshot ?? raw.delivery_address_snapshot;
    const courierName = pick(raw.courierName, raw.courier_name);
    const courierPhone = pick(raw.courierPhone, raw.courier_phone);
    const estimated = pick(raw.estimatedDeliveryAt, raw.estimated_delivery_at);
    const delivered = pick(raw.deliveredAt, raw.delivered_at);
    const contactName = pick(raw.customerNameSnapshot, raw.customer_name_snapshot);
    const contactPhone = pick(raw.customerPhoneSnapshot, raw.customer_phone_snapshot);

    if (!snap && !courierName && !courierPhone && !estimated && !delivered && !contactName && !contactPhone) {
        return undefined;
    }

    return {
        addressLine: snap?.street,
        street: snap?.street,
        city: snap?.city,
        latitude: snap?.lat,
        longitude: snap?.lng,
        notes: snap?.notes,
        contactName,
        contactPhone,
        courierName,
        courierPhone,
        estimatedArrival: estimated,
        deliveredAt: delivered,
    };
};

export const adaptOrderDetails = (raw: RawOrder | undefined | null): OrderDetails => {
    if (!raw) {
        throw new Error('adaptOrderDetails: received empty payload');
    }

    const subtotal = toNumber(raw.subtotal);
    const deliveryFee = toNumber(pick(raw.deliveryFee, raw.delivery_fee));
    const discount = toNumber(pick(raw.discountAmount, raw.discount_amount));
    const total = toNumber(
        pick(raw.totalAmount, raw.total_amount, raw.total),
        subtotal + deliveryFee - discount,
    );

    const items = raw.items?.map(adaptItem) ?? [];
    const statusHistory =
        (raw.statusHistory ?? raw.status_history)?.map(adaptStatusHistory) ?? [];

    return {
        orderId: pick(raw.id, raw.orderId) ?? '',
        orderNumber: pick(raw.orderNumber, raw.order_number),
        status: normalizeStatus(raw.status),
        createdAt:
            pick(raw.createdAt, raw.created_at) ?? new Date().toISOString(),
        updatedAt: pick(raw.updatedAt, raw.updated_at),
        restaurantId: pick(raw.restaurantId, raw.restaurant_id),
        restaurantName: pick(
            raw.restaurantName,
            raw.restaurantNameSnapshot,
            raw.restaurant_name_snapshot,
        ),
        items,
        subtotal,
        deliveryFee,
        discount,
        total,
        paymentMethod: pick(raw.paymentMethod, raw.payment_method),
        paymentStatus: pick(raw.paymentStatus, raw.payment_status),
        customerNotes: pick(raw.customerNotes, raw.customer_notes),
        // Driver acceptance flag — defaults to "none" when the backend hasn't
        // attached one yet, so the UI doesn't need a separate undefined check.
        deliveryAcceptance:
            (pick(
                (raw as Record<string, unknown>).deliveryAcceptance,
                (raw as Record<string, unknown>).delivery_acceptance,
            ) as 'none' | 'pending' | 'accepted' | 'rejected' | undefined) ?? 'none',
        statusHistory,
        delivery: adaptDelivery(raw),
        hasReceipt: Boolean(pick(raw.receiptKey, raw.receipt_key)),
        rating: raw.rating ?? null,
        ratingComment: pick(raw.ratingComment, raw.rating_comment) ?? null,
        ratedAt: pick(raw.ratedAt, raw.rated_at) ?? null,
    };
};

/** Light adapter for the orders list. Tolerates the raw entity shape. */
export const adaptOrderListItem = (raw: RawOrder | undefined | null): OrderListItem | null => {
    if (!raw) return null;
    const orderId = pick(raw.id, raw.orderId);
    if (!orderId) return null;

    const items: OrderItemPreview[] | undefined = raw.items?.map((item) => ({
        mealId: pick(item.mealId, item.meal_id),
        mealName:
            pick(item.mealName, item.mealNameSnapshot, item.meal_name_snapshot) ?? '',
        mealImage: pick(item.mealImage, item.meal_image),
        quantity: toNumber(item.quantity, 1),
    }));

    const subtotal = toNumber(raw.subtotal);
    const deliveryFee = toNumber(pick(raw.deliveryFee, raw.delivery_fee));
    const discount = toNumber(pick(raw.discountAmount, raw.discount_amount));
    const total = toNumber(
        pick(raw.totalAmount, raw.total_amount, raw.total),
        subtotal + deliveryFee - discount,
    );

    return {
        orderId,
        orderNumber: pick(raw.orderNumber, raw.order_number),
        status: normalizeStatus(raw.status),
        restaurantId: pick(raw.restaurantId, raw.restaurant_id),
        restaurantName: pick(
            raw.restaurantName,
            raw.restaurantNameSnapshot,
            raw.restaurant_name_snapshot,
        ),
        itemCount: items?.length,
        items,
        total,
        createdAt: pick(raw.createdAt, raw.created_at) ?? new Date().toISOString(),
    };
};

export const adaptOrderList = (raw: unknown[] | undefined | null): OrderListItem[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((row) => adaptOrderListItem(row as RawOrder))
        .filter(Boolean) as OrderListItem[];
};
