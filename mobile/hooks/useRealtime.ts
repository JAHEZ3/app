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

        return () => {
            offStatus();
            offAssigned();
            offLocation();
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
