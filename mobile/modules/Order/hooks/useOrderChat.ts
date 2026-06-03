import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { ChatMessageDto } from '../repository/OrderRepository';
import { socketService } from '@/socket/socket.service';

export const ORDER_CHAT_QUERY_KEY = ['order', 'chat'] as const;

const asObject = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

const adaptIncoming = (raw: unknown): ChatMessageDto | null => {
    const o = asObject(raw);
    if (!o) return null;
    const messageId = (o.messageId ?? o.id) as string | undefined;
    const senderId = (o.senderId ?? o.userId) as string | undefined;
    const body = (o.body ?? o.content ?? o.message) as string | undefined;
    const sentAt = (o.sentAt ?? o.createdAt ?? o.timestamp) as string | undefined;
    if (!messageId || !senderId || !body) return null;
    return {
        messageId,
        senderId,
        senderName: (o.senderName as string | undefined) ?? undefined,
        senderRole: (o.senderRole as string | undefined) ?? undefined,
        body,
        sentAt: sentAt ?? new Date().toISOString(),
    };
};

export const useOrderChatMessages = (orderId: string | undefined) => {
    const { getChatMessages } = useOrderRepository();
    const isAuthed = useAuthStore((s) => s.status) === 'authenticated';
    const queryClient = useQueryClient();

    const query = useQuery<ChatMessageDto[], AxiosError>({
        queryKey: [...ORDER_CHAT_QUERY_KEY, orderId],
        queryFn: () => getChatMessages(orderId as string),
        enabled: Boolean(orderId) && isAuthed,
        staleTime: 1000 * 15,
        refetchOnWindowFocus: false,
    });

    // Live append: chat:new events for this order room are pushed by the gateway
    // while the socket is connected and we've joined the room.
    useEffect(() => {
        if (!orderId) return;
        const off = socketService.on('chat:new', (payload) => {
            const o = asObject(payload);
            const eventOrderId =
                (o?.orderId as string | undefined) ?? (o?.roomId as string | undefined);
            if (!o || eventOrderId !== orderId) return;
            const msg = adaptIncoming(payload);
            if (!msg) return;
            queryClient.setQueryData<ChatMessageDto[] | undefined>(
                [...ORDER_CHAT_QUERY_KEY, orderId],
                (current) => {
                    if (!current) return [msg];
                    if (current.some((m) => m.messageId === msg.messageId)) return current;
                    return [...current, msg];
                },
            );
        });
        return off;
    }, [orderId, queryClient]);

    return query;
};

interface SendVariables {
    orderId: string;
    content: string;
}

export const useSendChatMessage = () => {
    const { sendChatMessage } = useOrderRepository();
    const queryClient = useQueryClient();

    return useMutation<ChatMessageDto, AxiosError, SendVariables>({
        mutationFn: ({ orderId, content }) => sendChatMessage(orderId, content),
        retry: 0,
        onSuccess: (message, { orderId }) => {
            queryClient.setQueryData<ChatMessageDto[] | undefined>(
                [...ORDER_CHAT_QUERY_KEY, orderId],
                (current) => {
                    if (!current) return [message];
                    if (current.some((m) => m.messageId === message.messageId)) return current;
                    return [...current, message];
                },
            );
        },
    });
};

export const getChatErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as { message?: string | string[] } | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};
