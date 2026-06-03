import type {
    CheckoutOrder,
    CheckoutPayload,
    OrderDetails,
    OrderListItem,
    OrdersPaginationMeta,
    OrdersQueryParams,
    PromoValidatePayload,
    PromoValidationResult,
} from '../types';

export interface OrdersPage {
    data: OrderListItem[];
    meta: OrdersPaginationMeta;
}

export interface PaymentProofAsset {
    uri: string;
    type: string;
    name: string;
}

export interface ChatMessageDto {
    messageId: string;
    senderId: string;
    senderName?: string;
    senderRole?: string;
    body: string;
    sentAt: string;
}

/**
 * Mirrors the backend `RateOrderDto` (order-service):
 *   POST /api/order/orders/:id/rate  (role: customer, order must be DELIVERED)
 * Both scores are required and must be >= 1. `comment` is optional free text.
 */
export interface RateOrderPayload {
    foodRating: number;
    deliveryRating: number;
    comment?: string;
}

export interface RestaurantPaymentAccount {
    type: 'bank' | 'wallet' | string;
    label?: string;
    bankName?: string;
    bankPhone?: string;
    accountName?: string;
    accountNumber?: string;
    iban?: string;
    walletName?: string;
    walletNumber?: string;
    walletPhone?: string;
    notes?: string;
}

export interface RestaurantPaymentInfo {
    restaurantId: string;
    accounts: RestaurantPaymentAccount[];
    instructions?: string | null;
}

export interface OpenDeliveryAgent {
    id: string;
    name?: string;
    phone?: string;
    vehicleType?: string;
    rating?: number;
    distanceKm?: number;
    estimatedMinutes?: number;
    profileImageUrl?: string;
}

export interface OpenDeliveryAgentsQuery {
    /** Drop-off latitude. Omit (or pass undefined) when no GPS fix is available. */
    lat?: number;
    /** Drop-off longitude. Omit (or pass undefined) when no GPS fix is available. */
    lng?: number;
    city?: string;
}

export interface OrderRepository {
    checkout: (payload: CheckoutPayload, idempotencyKey: string) => Promise<CheckoutOrder>;
    validatePromo: (payload: PromoValidatePayload) => Promise<PromoValidationResult>;
    getOrders: (params?: OrdersQueryParams) => Promise<OrdersPage>;
    getOrderById: (id: string) => Promise<OrderDetails>;
    getReceiptUrl: (id: string) => Promise<string | null>;
    getPaymentProofUrl: (id: string) => Promise<string | null>;
    uploadPaymentProof: (id: string, file: PaymentProofAsset) => Promise<void>;
    getChatMessages: (id: string) => Promise<ChatMessageDto[]>;
    sendChatMessage: (id: string, content: string) => Promise<ChatMessageDto>;
    rateOrder: (id: string, payload: RateOrderPayload) => Promise<void>;
    getRestaurantPaymentInfo: (restaurantId: string) => Promise<RestaurantPaymentInfo>;
    getOpenDeliveryAgents: (query: OpenDeliveryAgentsQuery) => Promise<OpenDeliveryAgent[]>;
    assignDeliveryAgent: (orderId: string, deliveryAgentId: string) => Promise<void>;
}
