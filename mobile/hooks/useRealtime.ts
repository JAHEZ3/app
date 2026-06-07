import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { socketService } from '@/socket/socket.service';
import {
    ORDERS_QUERY_KEY,
} from '@/modules/Order/hooks/useOrders';
import {
    ORDER_DETAILS_QUERY_KEY,
} from '@/modules/Order/hooks/useOrderDetails';
import type {
    OrderDetails,
    OrderDeliveryInfo,
    OrderListItem,
    OrderStatus,
    OrderStatusHistoryEntry,
} from '@/modules/Order/types';
import type { OrdersPage } from '@/modules/Order/repository/OrderRepository';

/** order:status / order:status:updated payload (api-gateway → mobile). */
export interface OrderStatusEvent {
    orderId: string;
    status: OrderStatus | string;
    changedAt?: string;
    note?: string;
    actor?: string;
}

/** order:delivery:assigned payload. */
export interface OrderDeliveryAssignedEvent {
    orderId: string;
    deliveryAgentId: string;
    deliveryAgentName?: string;
    deliveryAgentPhone?: string;
    estimatedDeliveryAt?: string;
}

/** delivery:location payload. */
export interface DeliveryLocationEvent {
    eventId?: string;
    agentId: string;
    orderId?: string;
    lat: number;
    lng: number;
    timestamp: number;
}

/** order:payment:status payload — fires when a restaurant verifies a bank
 *  transfer and flips the order's paymentStatus. */
export interface OrderPaymentStatusEvent {
    eventId?: string;
    orderId: string;
    orderNumber?: string;
    paymentStatus: 'paid' | 'unpaid' | 'refunded' | string;
    customerId?: string;
    restaurantId?: string;
    ownerUserId?: string;
    changedAt?: string;
    note?: string | null;
}

/**
 * order:delivery:accepted / order:delivery:rejected payloads — fire when a
 * delivery agent accepts or declines a customer's self-picked assignment.
 *
 * On `accepted`, the customer's tracking screen should flip out of "waiting"
 * state. On `rejected`, the assignment is cleared server-side so the
 * customer's UI should reset to the "pick a driver" state.
 */
export interface OrderDeliveryAcceptanceEvent {
    eventId?: string;
    orderId: string;
    orderNumber?: string;
    deliveryAgentId?: string;
    /** Only on `rejected` payloads. */
    reason?: string | null;
    acceptedAt?: string;
    rejectedAt?: string;
}

/** chat:new / chat:message payload. */
export interface ChatMessageEvent {
    roomId?: string;
    orderId?: string;
    messageId: string;
    senderId: string;
    senderName?: string;
    body: string;
    sentAt: string;
}

export interface ChatMessage {
    messageId: string;
    senderId: string;
    senderName?: string;
    body: string;
    sentAt: string;
}

export const chatRoomQueryKey = (roomId: string) =>
    ['chat', 'room', roomId, 'messages'] as const;

// ─── Type guards ────────────────────────────────────────────────────────────

const asObject = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const isOrderStatusEvent = (data: unknown): data is OrderStatusEvent => {
    const o = asObject(data);
    return !!o && typeof o.orderId === 'string' && typeof o.status === 'string';
};

const isDeliveryAssignedEvent = (data: unknown): data is OrderDeliveryAssignedEvent => {
    const o = asObject(data);
    return !!o && typeof o.orderId === 'string' && typeof o.deliveryAgentId === 'string';
};

const isDeliveryLocationEvent = (data: unknown): data is DeliveryLocationEvent => {
    const o = asObject(data);
    return (
        !!o &&
        typeof o.agentId === 'string' &&
        typeof o.lat === 'number' &&
        typeof o.lng === 'number'
    );
};

const isOrderPaymentStatusEvent = (data: unknown): data is OrderPaymentStatusEvent => {
    const o = asObject(data);
    return (
        !!o &&
        typeof o.orderId === 'string' &&
        typeof o.paymentStatus === 'string'
    );
};

const isOrderDeliveryAcceptanceEvent = (
    data: unknown,
): data is OrderDeliveryAcceptanceEvent => {
    const o = asObject(data);
    return !!o && typeof o.orderId === 'string';
};

const isChatMessageEvent = (data: unknown): data is ChatMessageEvent => {
    const o = asObject(data);
    if (!o) return false;
    const room = typeof o.roomId === 'string' ? o.roomId : (o.orderId as string | undefined);
    return (
        typeof room === 'string' &&
        typeof o.messageId === 'string' &&
        typeof o.body === 'string'
    );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useRealtime = () => {
    const queryClient = useQueryClient();
    const accessToken = useAuthStore((s) => s.accessToken);
    const status = useAuthStore((s) => s.status);

    useEffect(() => {
        if (status !== 'authenticated' || !accessToken) {
            socketService.disconnect();
            return;
        }

        socketService.connect(accessToken);

        const offStatus = socketService.on('order:status', (payload) => {
            if (!isOrderStatusEvent(payload)) {
                console.log('[realtime] order:status — invalid payload', payload);
                return;
            }
            patchOrderStatus(queryClient, payload);
        });

        const offAssigned = socketService.on('order:delivery:assigned', (payload) => {
            if (!isDeliveryAssignedEvent(payload)) {
                console.log('[realtime] order:delivery:assigned — invalid payload', payload);
                return;
            }
            patchDeliveryAssigned(queryClient, payload);
        });

        const offLocation = socketService.on('delivery:location', (payload) => {
            if (!isDeliveryLocationEvent(payload)) {
                console.log('[realtime] delivery:location — invalid payload', payload);
                return;
            }
            patchDeliveryLocation(queryClient, payload);
        });

        const offChat = socketService.on('chat:message', (payload) => {
            if (!isChatMessageEvent(payload)) {
                console.log('[realtime] chat:message — invalid payload', payload);
                return;
            }
            appendChatMessage(queryClient, payload);
        });

        // Payment status flip (unpaid ↔ paid) — patch the cached order so the
        // tracking screen and order-details show the new badge immediately.
        const offPayment = socketService.on('order:payment:status', (payload) => {
            if (!isOrderPaymentStatusEvent(payload)) {
                console.log('[realtime] order:payment:status — invalid payload', payload);
                return;
            }
            patchOrderPaymentStatus(queryClient, payload);
        });

        // Driver accepted the assignment — flip the order's deliveryAcceptance
        // to 'accepted' so the tracking UI exits the "waiting" state.
        const offAccepted = socketService.on('order:delivery:accepted', (payload) => {
            if (!isOrderDeliveryAcceptanceEvent(payload)) {
                console.log('[realtime] order:delivery:accepted — invalid payload', payload);
                return;
            }
            patchOrderAcceptance(queryClient, payload.orderId, 'accepted');
        });

        // Driver rejected — server already cleared deliveryAgentId, so we
        // mirror that locally: blank the courier name + reset acceptance so
        // the customer's "Pick a driver" card reappears.
        const offRejected = socketService.on('order:delivery:rejected', (payload) => {
            if (!isOrderDeliveryAcceptanceEvent(payload)) {
                console.log('[realtime] order:delivery:rejected — invalid payload', payload);
                return;
            }
            patchOrderAcceptance(queryClient, payload.orderId, 'none', /*clearAgent*/ true);
        });

        return () => {
            offStatus();
            offAssigned();
            offLocation();
            offPayment();
            offAccepted();
            offRejected();
            offChat();
        };
    }, [accessToken, queryClient, status]);

    useEffect(() => {
        return () => {
            socketService.disconnect();
        };
    }, []);
};

// ─── Cache patchers ─────────────────────────────────────────────────────────

/**
 * Patch the order's `deliveryAcceptance` (and optionally clear the courier)
 * in both the detail and list caches. `clearAgent` is true on rejected
 * events so the customer's UI sees the order as un-assigned again.
 */
const patchOrderAcceptance = (
    queryClient: ReturnType<typeof useQueryClient>,
    orderId: string,
    acceptance: 'none' | 'pending' | 'accepted' | 'rejected',
    clearAgent = false,
) => {
    queryClient.setQueriesData(
        { queryKey: ['order', orderId] },
        (prev: unknown) => {
            const o = asObject(prev);
            if (!o) return prev;
            const next: Record<string, unknown> = {
                ...o,
                deliveryAcceptance: acceptance,
            };
            if (clearAgent) {
                const delivery = asObject((o as { delivery?: unknown }).delivery);
                if (delivery) {
                    next.delivery = {
                        ...delivery,
                        courierName: undefined,
                        courierPhone: undefined,
                    };
                }
            }
            return next;
        },
    );
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
};

/**
 * Surgical cache patch for payment status. Updates both the single-order
 * detail cache and any list query that contains this order, so the customer
 * sees "مدفوع" instantly when the restaurant verifies their proof.
 */
const patchOrderPaymentStatus = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: OrderPaymentStatusEvent,
) => {
    // Detail cache — match anything keyed on this orderId.
    queryClient.setQueriesData(
        { queryKey: ['order', event.orderId] },
        (prev: unknown) => {
            const o = asObject(prev);
            if (!o) return prev;
            return { ...o, paymentStatus: event.paymentStatus };
        },
    );
    // List caches — find the row and update in-place.
    queryClient.setQueriesData({ queryKey: ['orders'] }, (prev: unknown) => {
        const o = asObject(prev);
        if (!o) return prev;
        const data = Array.isArray((o as { data?: unknown[] }).data)
            ? ((o as { data: unknown[] }).data as unknown[])
            : null;
        if (!data) return prev;
        const next = data.map((row) => {
            const r = asObject(row);
            if (!r) return row;
            const id = r.orderId ?? r.id;
            return id === event.orderId ? { ...r, paymentStatus: event.paymentStatus } : row;
        });
        return { ...o, data: next };
    });
    // Belt-and-suspenders refetch so anything we don't know to patch refreshes.
    queryClient.invalidateQueries({ queryKey: ['order', event.orderId] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
};

const patchOrderStatus = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: OrderStatusEvent,
) => {
    const changedAt = event.changedAt ?? new Date().toISOString();

    queryClient.setQueryData<OrderDetails | undefined>(
        [...ORDER_DETAILS_QUERY_KEY, event.orderId],
        (current) => {
            if (!current) return current;
            const nextHistoryEntry: OrderStatusHistoryEntry = {
                status: event.status,
                changedAt,
                note: event.note,
                actor: event.actor,
            };
            const history = current.statusHistory ?? [];
            const alreadyRecorded = history.some(
                (entry) =>
                    entry.status === event.status && entry.changedAt === changedAt,
            );
            return {
                ...current,
                status: event.status,
                updatedAt: changedAt,
                statusHistory: alreadyRecorded ? history : [...history, nextHistoryEntry],
            };
        },
    );

    queryClient.setQueriesData<InfiniteData<OrdersPage> | undefined>(
        { queryKey: ORDERS_QUERY_KEY },
        (current) => {
            if (!current) return current;
            let mutated = false;
            const pages = current.pages.map((page) => {
                const nextData = page.data.map((item: OrderListItem) => {
                    if (item.orderId !== event.orderId) return item;
                    if (item.status === event.status) return item;
                    mutated = true;
                    return { ...item, status: event.status };
                });
                return mutated ? { ...page, data: nextData } : page;
            });
            return mutated ? { ...current, pages } : current;
        },
    );
};

const patchDeliveryAssigned = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: OrderDeliveryAssignedEvent,
) => {
    queryClient.setQueryData<OrderDetails | undefined>(
        [...ORDER_DETAILS_QUERY_KEY, event.orderId],
        (current) => {
            if (!current) return current;
            const nextDelivery: OrderDeliveryInfo = {
                ...(current.delivery ?? {}),
                courierName: event.deliveryAgentName ?? current.delivery?.courierName,
                courierPhone: event.deliveryAgentPhone ?? current.delivery?.courierPhone,
                estimatedArrival:
                    event.estimatedDeliveryAt ?? current.delivery?.estimatedArrival,
            };
            return { ...current, delivery: nextDelivery };
        },
    );
};

const patchDeliveryLocation = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: DeliveryLocationEvent,
) => {
    if (!event.orderId) return;
    queryClient.setQueryData<OrderDetails | undefined>(
        [...ORDER_DETAILS_QUERY_KEY, event.orderId],
        (current) => {
            if (!current) return current;
            const nextDelivery: OrderDeliveryInfo = {
                ...(current.delivery ?? {}),
                latitude: event.lat,
                longitude: event.lng,
            };
            return { ...current, delivery: nextDelivery };
        },
    );
};

const appendChatMessage = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: ChatMessageEvent,
) => {
    const roomId = event.roomId ?? event.orderId;
    if (!roomId) return;
    queryClient.setQueryData<ChatMessage[]>(
        chatRoomQueryKey(roomId),
        (current) => {
            const message: ChatMessage = {
                messageId: event.messageId,
                senderId: event.senderId,
                senderName: event.senderName,
                body: event.body,
                sentAt: event.sentAt,
            };
            if (!current) return [message];
            if (current.some((m) => m.messageId === message.messageId)) return current;
            return [...current, message];
        },
    );
};
