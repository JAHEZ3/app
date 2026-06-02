import { AxiosError } from 'axios';
import { deliveryApi, orderApi, restaurantApi } from '@/lib/api';
import type {
    CheckoutOrder,
    CheckoutPayload,
    CheckoutResponse,
    OrderDetails,
    OrderDetailsResponse,
    OrderRating,
    OrdersListResponse,
    OrdersPaginationMeta,
    PromoValidatePayload,
    PromoValidateResponse,
    PromoValidationResult,
    RateOrderPayload,
    RateOrderResponse,
    ReceiptUrlResponse,
} from '../types';
import {
    ChatMessageDto,
    OpenDeliveryAgent,
    OpenDeliveryAgentsQuery,
    OrderRepository,
    OrdersPage,
    PaymentProofAsset,
    RateOrderPayload,
    RestaurantPaymentAccount,
    RestaurantPaymentInfo,
} from './OrderRepository';
import { adaptOrderDetails, adaptOrderList } from '../adapter/orderAdapter';

const CHECKOUT_URL = '/api/order/checkout';
const PROMO_VALIDATE_URL = '/api/order/promo/validate';
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
    checkout: async (payload: CheckoutPayload, idempotencyKey: string): Promise<CheckoutOrder> => {
        console.log(`[order] → POST ${CHECKOUT_URL}`, { idempotencyKey, payload });
        try {
            const res = await orderApi.post<CheckoutResponse>(
                CHECKOUT_URL,
                payload,
                { headers: { 'Idempotency-Key': idempotencyKey } },
            );
            console.log('[order] ← POST checkout response', res.data);
            return res.data.data;
        } catch (err) {
            logError('checkout', err);
            throw err;
        }
    },

    validatePromo: async (payload: PromoValidatePayload): Promise<PromoValidationResult> => {
        console.log(`[order] → POST ${PROMO_VALIDATE_URL}`, payload);
        try {
            const res = await orderApi.post<PromoValidateResponse>(PROMO_VALIDATE_URL, payload);
            console.log('[order] ← POST promo validate response', res.data);
            return res.data.data;
        } catch (err) {
            logError('validatePromo', err);
            throw err;
        }
    },

    getOrders: async (params): Promise<OrdersPage> => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;
        const queryParams: Record<string, string | number> = { page, limit };
        if (params?.status) queryParams.status = params.status;
        if (params?.search) queryParams.search = params.search;

        console.log(`[order] → GET ${ORDERS_URL}`, queryParams);
        try {
            const res = await orderApi.get<unknown>(ORDERS_URL, { params: queryParams });
            console.log('[order] ← GET orders response', res.data);
            return extractOrdersPage(res.data, page, limit);
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
            // Backend returns the raw Order entity; normalize through adapter.
            return adaptOrderDetails(res.data.data as unknown as Parameters<typeof adaptOrderDetails>[0]);
        } catch (err) {
            logError('getOrderById', err);
            throw err;
        }
    },

    getReceiptUrl: async (id: string): Promise<string | null> => {
        const url = `${ORDERS_URL}/${id}/receipt`;
        console.log(`[order] → GET ${url}`);
        try {
            const res = await orderApi.get<ReceiptUrlResponse>(url);
            return res.data?.data?.url ?? null;
        } catch (err) {
            logError('getReceiptUrl', err);
            throw err;
        }
    },

<<<<<<< HEAD
    rateOrder: async (
        id: string,
        payload: RateOrderPayload,
    ): Promise<OrderRating> => {
        const url = `${ORDERS_URL}/${id}/rate`;
        console.log(`[order] → POST ${url}`, payload);
        try {
            const res = await orderApi.post<RateOrderResponse>(url, payload);
            return res.data.data;
=======
    getPaymentProofUrl: async (id: string): Promise<string | null> => {
        const url = `${ORDERS_URL}/${id}/payment-proof`;
        console.log(`[order] → GET ${url}`);
        try {
            const res = await orderApi.get<ReceiptUrlResponse>(url);
            return res.data?.data?.url ?? null;
        } catch (err) {
            logError('getPaymentProofUrl', err);
            throw err;
        }
    },

    uploadPaymentProof: async (id: string, file: PaymentProofAsset): Promise<void> => {
        const url = `${ORDERS_URL}/${id}/payment-proof`;
        console.log(`[order] → POST ${url}`, { name: file.name, type: file.type });
        const data = new FormData();
        data.append('file', {
            uri: file.uri,
            type: file.type,
            name: file.name,
        } as unknown as Blob);
        try {
            await orderApi.post(url, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } catch (err) {
            logError('uploadPaymentProof', err);
            throw err;
        }
    },

    getChatMessages: async (id: string): Promise<ChatMessageDto[]> => {
        const url = `${ORDERS_URL}/${id}/chat`;
        console.log(`[order] → GET ${url}`);
        try {
            const res = await orderApi.get<{ data: unknown }>(url);
            const raw = res.data?.data ?? [];
            if (!Array.isArray(raw)) return [];
            return raw
                .map(adaptChatMessage)
                .filter((m): m is ChatMessageDto => m !== null);
        } catch (err) {
            logError('getChatMessages', err);
            throw err;
        }
    },

    sendChatMessage: async (id: string, content: string): Promise<ChatMessageDto> => {
        const url = `${ORDERS_URL}/${id}/chat`;
        console.log(`[order] → POST ${url}`);
        try {
            const res = await orderApi.post<{ data: unknown }>(url, { content });
            const adapted = adaptChatMessage(res.data?.data);
            if (!adapted) {
                // Fall back to a synthesized record so the optimistic-append in
                // the hook still works even if the server omits a field.
                return {
                    messageId: `local-${Date.now()}`,
                    senderId: 'me',
                    body: content,
                    sentAt: new Date().toISOString(),
                };
            }
            return adapted;
        } catch (err) {
            logError('sendChatMessage', err);
            throw err;
        }
    },

    rateOrder: async (id: string, payload: RateOrderPayload): Promise<void> => {
        const url = `${ORDERS_URL}/${id}/rate`;
        console.log(`[order] → POST ${url}`, payload);
        try {
            await orderApi.post(url, payload);
>>>>>>> origin/Dashbords
        } catch (err) {
            logError('rateOrder', err);
            throw err;
        }
    },
<<<<<<< HEAD
=======

    getRestaurantPaymentInfo: async (restaurantId: string): Promise<RestaurantPaymentInfo> => {
        // Try the mobile-prefixed path first (same base as restaurant details).
        // Fall back to the flat path in case the gateway routes both.
        const mobilePath = `/api/restaurant/mobile/restaurants/${restaurantId}/payment-info`;
        const fallbackPath = `/api/restaurant/${restaurantId}/payment-info`;
        console.log(`[order] → GET payment-info for restaurant ${restaurantId}`);
        for (const url of [mobilePath, fallbackPath]) {
            try {
                const res = await restaurantApi.get<{ data: unknown }>(url);
                console.log(`[order] ← GET ${url} raw:`, JSON.stringify(res.data).slice(0, 300));
                const result = normalizeRestaurantPaymentInfo(restaurantId, res.data?.data ?? res.data);
                console.log(`[order] ← payment-info parsed accounts:`, result.accounts.length);
                return result;
            } catch (err: any) {
                const status = err?.response?.status;
                // 404 means this path doesn't exist — try the next one silently.
                if (status === 404) continue;
                logError(`getRestaurantPaymentInfo (${url})`, err);
                // Any non-404 error (5xx, network) — degrade gracefully.
                break;
            }
        }
        return { restaurantId, accounts: [] };
    },

    getOpenDeliveryAgents: async (query: OpenDeliveryAgentsQuery): Promise<OpenDeliveryAgent[]> => {
        const url = '/api/delivery/open';
        const params: Record<string, string | number> = {};
        // Only send coordinates when they are a real GPS fix — (0, 0) maps to
        // the Gulf of Guinea and produces nonsensical distance rankings.
        const hasCoords =
            typeof query.lat === 'number' &&
            typeof query.lng === 'number' &&
            (query.lat !== 0 || query.lng !== 0);
        if (hasCoords) {
            params.lat = query.lat as number;
            params.lng = query.lng as number;
        }
        if (query.city) params.city = query.city;
        console.log(`[order] → GET ${url}`, params);
        try {
            const res = await deliveryApi.get<{ data: unknown }>(url, { params });
            return adaptOpenAgents(res.data?.data);
        } catch (err) {
            logError('getOpenDeliveryAgents', err);
            throw err;
        }
    },

    assignDeliveryAgent: async (orderId: string, deliveryAgentId: string): Promise<void> => {
        const url = `${ORDERS_URL}/${orderId}/delivery`;
        console.log(`[order] → PATCH ${url}`, { deliveryAgentId });
        try {
            await orderApi.patch(url, { deliveryAgentId });
        } catch (err) {
            logError('assignDeliveryAgent', err);
            throw err;
        }
    },
>>>>>>> origin/Dashbords
});

/**
 * The orders list endpoint can return one of three shapes depending on backend
 * version. We tolerate all three so the UI keeps working through migrations.
 *
 * Shape A — flat with sibling pagination keys (current production):
 *   { data: [...orders], page, pages, total, message }
 *
 * Shape B — nested with pagination next to the array (current doc):
 *   { data: { data: [...orders], total, page, limit, pages } }
 *
 * Shape C — older meta object alongside data:
 *   { data: [...orders], meta: { total, page, limit, totalPages, ... } }
 */
const extractOrdersPage = (
    raw: unknown,
    page: number,
    limit: number,
): OrdersPage => {
    const root = asObject(raw);
    if (!root) {
        return { data: [], meta: DEFAULT_META(page, limit, 0) };
    }

    // Shape B: { data: { data: [...], total, page, limit, pages } }
    const inner = asObject(root.data);
    if (inner && Array.isArray(inner.data)) {
        const data = adaptOrderList(inner.data as unknown[]);
        const total = typeof inner.total === 'number' ? inner.total : data.length;
        const respPage = typeof inner.page === 'number' ? inner.page : page;
        const respLimit = typeof inner.limit === 'number' ? inner.limit : limit;
        const totalPages =
            typeof inner.pages === 'number'
                ? inner.pages
                : Math.max(1, Math.ceil(total / Math.max(respLimit, 1)));
        return {
            data,
            meta: {
                total,
                page: respPage,
                limit: respLimit,
                totalPages,
                hasNextPage: respPage < totalPages,
                hasPrevPage: respPage > 1,
            },
        };
    }

    // Shape A / C: { data: [...], ... }
    const rawArray = Array.isArray(root.data) ? (root.data as unknown[]) : [];
    const data = adaptOrderList(rawArray);

    // Shape C: meta alongside
    const meta = asObject(root.meta);
    if (meta) {
        const total = typeof meta.total === 'number' ? meta.total : data.length;
        const respPage = typeof meta.page === 'number' ? meta.page : page;
        const respLimit = typeof meta.limit === 'number' ? meta.limit : limit;
        const totalPages =
            typeof meta.totalPages === 'number'
                ? meta.totalPages
                : typeof meta.pages === 'number'
                  ? meta.pages
                  : Math.max(1, Math.ceil(total / Math.max(respLimit, 1)));
        return {
            data,
            meta: {
                total,
                page: respPage,
                limit: respLimit,
                totalPages,
                hasNextPage:
                    typeof meta.hasNextPage === 'boolean'
                        ? meta.hasNextPage
                        : respPage < totalPages,
                hasPrevPage:
                    typeof meta.hasPrevPage === 'boolean'
                        ? meta.hasPrevPage
                        : respPage > 1,
            },
        };
    }

    // Shape A: sibling pagination keys on the root
    const total = typeof root.total === 'number' ? root.total : data.length;
    const respPage = typeof root.page === 'number' ? root.page : page;
    const respLimit = typeof root.limit === 'number' ? root.limit : limit;
    const totalPages =
        typeof root.pages === 'number'
            ? root.pages
            : Math.max(1, Math.ceil(total / Math.max(respLimit, 1)));
    return {
        data,
        meta: {
            total,
            page: respPage,
            limit: respLimit,
            totalPages,
            hasNextPage: respPage < totalPages,
            hasPrevPage: respPage > 1,
        },
    };
};

const adaptChatMessage = (raw: unknown): ChatMessageDto | null => {
    const o = asObject(raw);
    if (!o) return null;
    const messageId =
        (typeof o.messageId === 'string' && o.messageId) ||
        (typeof o.id === 'string' && o.id) ||
        null;
    const senderId =
        (typeof o.senderId === 'string' && o.senderId) ||
        (typeof o.userId === 'string' && o.userId) ||
        null;
    const body =
        (typeof o.body === 'string' && o.body) ||
        (typeof o.content === 'string' && o.content) ||
        (typeof o.message === 'string' && o.message) ||
        null;
    if (!messageId || !senderId || !body) return null;
    return {
        messageId,
        senderId,
        senderName: typeof o.senderName === 'string' ? o.senderName : undefined,
        senderRole: typeof o.senderRole === 'string' ? o.senderRole : undefined,
        body,
        sentAt:
            (typeof o.sentAt === 'string' && o.sentAt) ||
            (typeof o.createdAt === 'string' && o.createdAt) ||
            new Date().toISOString(),
    };
};

const adaptOpenAgents = (raw: unknown): OpenDeliveryAgent[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(adaptOpenAgent)
        .filter((a): a is OpenDeliveryAgent => a !== null);
};

const adaptOpenAgent = (raw: unknown): OpenDeliveryAgent | null => {
    const o = asObject(raw);
    if (!o) return null;
    const id =
        (typeof o.id === 'string' && o.id) ||
        (typeof o.agentId === 'string' && o.agentId) ||
        (typeof o.userId === 'string' && o.userId) ||
        null;
    if (!id) return null;
    return {
        id,
        name:
            (typeof o.name === 'string' && o.name) ||
            (typeof o.fullName === 'string' && o.fullName) ||
            [o.firstName, o.lastName].filter(Boolean).join(' ').trim() ||
            undefined,
        phone: typeof o.phone === 'string' ? o.phone : undefined,
        vehicleType: typeof o.vehicleType === 'string' ? o.vehicleType : undefined,
        rating: typeof o.rating === 'number' ? o.rating : undefined,
        distanceKm:
            typeof o.distanceKm === 'number'
                ? o.distanceKm
                : typeof o.distance === 'number'
                  ? o.distance
                  : undefined,
        estimatedMinutes:
            typeof o.estimatedMinutes === 'number'
                ? o.estimatedMinutes
                : typeof o.etaMinutes === 'number'
                  ? o.etaMinutes
                  : undefined,
        profileImageUrl:
            typeof o.profileImageUrl === 'string'
                ? o.profileImageUrl
                : typeof o.avatarUrl === 'string'
                  ? o.avatarUrl
                  : undefined,
    };
};

const asObject = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

/** Map server payment-type strings to our canonical bank | wallet. */
const canonicalPaymentType = (raw: string | undefined): 'bank' | 'wallet' | string => {
    const v = (raw ?? '').toLowerCase().trim();
    if (
        v === 'bank' ||
        v === 'bank_account' ||
        v === 'bankaccount' ||
        v === 'iban'
    ) {
        return 'bank';
    }
    if (
        v === 'wallet' ||
        v === 'mahfaza' ||
        v === 'mahfaze' ||
        v === 'mobile_wallet' ||
        v === 'ewallet'
    ) {
        return 'wallet';
    }
    return v || 'bank';
};

const normalizeAccount = (raw: unknown): RestaurantPaymentAccount | null => {
    const o = asObject(raw);
    if (!o) return null;
    const type = canonicalPaymentType(str(o.type));
    const walletNumber = str(o.walletNumber) ?? str(o.wallet_number);
    // Wallets on the backend use plain `phone`; banks use `bankPhone`. Aliasing
    // both into `walletPhone` so the UI can render either.
    const walletPhone =
        str(o.walletPhone) ?? str(o.wallet_phone) ?? (type === 'wallet' ? str(o.phone) : undefined);
    const accountNumber = str(o.accountNumber) ?? str(o.account_number);
    const iban = str(o.iban);
    const bankPhone = str(o.bankPhone) ?? str(o.bank_phone);
    // Need at least one identifier to be useful.
    if (!walletNumber && !walletPhone && !accountNumber && !iban) return null;
    return {
        type,
        label: str(o.label),
        bankName: str(o.bankName) ?? str(o.bank_name),
        bankPhone,
        accountName: str(o.accountName) ?? str(o.account_name) ?? str(o.holderName),
        accountNumber,
        iban,
        walletName: str(o.walletName) ?? str(o.wallet_name),
        walletNumber,
        walletPhone,
        notes: str(o.notes),
    };
};

/** Try to parse a value that may be a JSON string or already an object. */
const tryParseJson = (v: unknown): unknown => {
    if (v && typeof v === 'object') return v;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return null; }
    }
    return null;
};

const normalizeRestaurantPaymentInfo = (
    restaurantId: string,
    raw: unknown,
): RestaurantPaymentInfo => {
    const root = asObject(raw);
    let rawAccounts: unknown[] = [];

    // Shape 1: [ {...}, {...} ] — bare array
    if (Array.isArray(raw)) {
        rawAccounts = raw;
    } else if (root) {
        // Shape 2: { accounts: [...] }
        if (Array.isArray(root.accounts)) {
            rawAccounts = root.accounts as unknown[];
        }
        // Shape 3/3b: { paymentInfo: {...} | "[{...}]" | "[...]" }
        // paymentInfo may come back as a parsed object OR as a stringified JSON
        // blob depending on whether the ORM auto-deserialises the JSONB column.
        else if (root.paymentInfo != null) {
            const pi = tryParseJson(root.paymentInfo);
            if (Array.isArray(pi)) {
                rawAccounts = pi as unknown[];
            } else if (pi && typeof pi === 'object') {
                rawAccounts = [pi];
            }
        }
        // Shape 4: { iban, type, ... } — flat single account (root IS the account)
        else if (str(root.type) || str(root.iban) || str(root.walletNumber) || str(root.accountNumber)) {
            rawAccounts = [root];
        }
    }

    const accounts = rawAccounts
        .map(normalizeAccount)
        .filter(Boolean) as RestaurantPaymentAccount[];

    const instructions = root ? str(root.instructions) ?? str(root.note) ?? null : null;
    return { restaurantId, accounts, instructions };
};
