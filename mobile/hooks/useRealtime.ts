import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { realtimeSocket } from '@/lib/socket';
import {
    ORDERS_QUERY_KEY,
} from '@/modules/Order/hooks/useOrders';
import {
    ORDER_DETAILS_QUERY_KEY,
} from '@/modules/Order/hooks/useOrderDetails';
import type {
    OrderDetails,
    OrderListItem,
    OrderStatus,
    OrderStatusHistoryEntry,
} from '@/modules/Order/types';
import type { OrdersPage } from '@/modules/Order/repository/OrderRepository';

export interface OrderStatusEvent {
    orderId: string;
    status: OrderStatus | string;
    changedAt?: string;
    note?: string;
    actor?: string;
}

export interface ChatMessageEvent {
    roomId: string;
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

const isOrderStatusEvent = (data: unknown): data is OrderStatusEvent => {
    if (!data || typeof data !== 'object') return false;
    const o = data as Record<string, unknown>;
    return typeof o.orderId === 'string' && typeof o.status === 'string';
};

const isChatMessageEvent = (data: unknown): data is ChatMessageEvent => {
    if (!data || typeof data !== 'object') return false;
    const o = data as Record<string, unknown>;
    return (
        typeof o.roomId === 'string' &&
        typeof o.messageId === 'string' &&
        typeof o.body === 'string'
    );
};

export const useRealtime = () => {
    const queryClient = useQueryClient();
    const accessToken = useAuthStore((s) => s.accessToken);
    const status = useAuthStore((s) => s.status);

    useEffect(() => {
        if (status !== 'authenticated' || !accessToken) {
            realtimeSocket.disconnect();
            return;
        }

        realtimeSocket.connect(accessToken);

        const offOrderStatus = realtimeSocket.addListener('order:status', (payload) => {
            if (!isOrderStatusEvent(payload)) {
                console.log('[ws] order:status — invalid payload', payload);
                return;
            }
            patchOrderStatus(queryClient, payload);
        });

        const offChatMessage = realtimeSocket.addListener('chat:message', (payload) => {
            if (!isChatMessageEvent(payload)) {
                console.log('[ws] chat:message — invalid payload', payload);
                return;
            }
            appendChatMessage(queryClient, payload);
        });

        return () => {
            offOrderStatus();
            offChatMessage();
        };
    }, [accessToken, queryClient, status]);

    useEffect(() => {
        return () => {
            realtimeSocket.disconnect();
        };
    }, []);
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

const appendChatMessage = (
    queryClient: ReturnType<typeof useQueryClient>,
    event: ChatMessageEvent,
) => {
    queryClient.setQueryData<ChatMessage[]>(
        chatRoomQueryKey(event.roomId),
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
