import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ChatService } from '@/services/chat.service';
import { socketService } from '@/socket/socket.service';
import { useJoinOrderRoom } from '@/hooks/useSocket';
import { generateUuidV4 } from '@/modules/Order/utils/uuid';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserIdFromToken } from './jwt';
import type { ChatMessage } from './types';

interface ChatRealtimePayload {
    orderId: string;
    messageId: string;
    senderId: string;
    senderRole?: string;
    senderName?: string;
    content: string;
    createdAt?: string;
}

const isChatRealtimePayload = (data: unknown): data is ChatRealtimePayload => {
    if (!data || typeof data !== 'object') return false;
    const o = data as Record<string, unknown>;
    return (
        typeof o.orderId === 'string' &&
        typeof o.messageId === 'string' &&
        typeof o.senderId === 'string' &&
        typeof o.content === 'string'
    );
};

export const orderChatQueryKey = (orderId: string) =>
    ['order', 'chat', orderId] as const;

interface UseOrderChatArgs {
    orderId: string | undefined;
    enabled?: boolean;
}

interface SendArgs {
    content: string;
}

export const useOrderChat = ({ orderId, enabled = true }: UseOrderChatArgs) => {
    const queryClient = useQueryClient();
    const accessToken = useAuthStore((s) => s.accessToken);
    const status = useAuthStore((s) => s.status);
    const isAuthed = status === 'authenticated';
    const currentUserId = useMemo(
        () => getUserIdFromToken(accessToken),
        [accessToken],
    );

    // Join the order room so chat:message reaches this socket even after a reconnect.
    useJoinOrderRoom(orderId, enabled && isAuthed);

    const queryKey = orderId ? orderChatQueryKey(orderId) : ['order', 'chat', 'idle'];

    const query = useQuery<ChatMessage[], AxiosError>({
        queryKey,
        queryFn: () => ChatService.getMessages(orderId as string),
        enabled: enabled && isAuthed && Boolean(orderId),
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    /** Append a server message — dedupe by id and (optimistic) clientId. */
    const upsertMessage = useCallback(
        (next: ChatMessage) => {
            if (!orderId) return;
            queryClient.setQueryData<ChatMessage[]>(
                orderChatQueryKey(orderId),
                (current) => {
                    if (!current) return [next];

                    // Already present by server id — no-op.
                    if (current.some((m) => m.id === next.id)) return current;

                    // Replace optimistic entry by clientId.
                    if (next.clientId) {
                        const replaced = current.map((m) =>
                            m.clientId === next.clientId ? next : m,
                        );
                        if (replaced.some((m) => m.id === next.id)) return replaced;
                    }

                    return [...current, next];
                },
            );
        },
        [orderId, queryClient],
    );

    // Listen for realtime messages. The service dedupes handlers by reference,
    // so this hook safely binds once per (orderId, enabled) tuple.
    useEffect(() => {
        if (!enabled || !orderId || !isAuthed) return;
        const off = socketService.on('chat:message', (payload) => {
            if (!isChatRealtimePayload(payload)) return;
            if (payload.orderId !== orderId) return;
            upsertMessage({
                id: payload.messageId,
                orderId: payload.orderId,
                senderId: payload.senderId,
                senderRole: payload.senderRole ?? 'restaurant',
                senderName: payload.senderName ?? '',
                content: payload.content,
                createdAt: payload.createdAt ?? new Date().toISOString(),
            });
        });
        return off;
    }, [orderId, enabled, isAuthed, upsertMessage]);

    // Local clientId cache so we can correlate optimistic → server message.
    const pendingClientIds = useRef<Map<string, string>>(new Map());

    const sendMutation = useMutation<ChatMessage, AxiosError, SendArgs>({
        mutationFn: async ({ content }: SendArgs) => {
            if (!orderId) throw new Error('orderId required');
            const server = await ChatService.sendMessage(orderId, content);
            return server;
        },
        retry: 0,
    });

    const send = useCallback(
        (content: string) => {
            const trimmed = content.trim();
            if (!trimmed || !orderId) return;
            const clientId = generateUuidV4();
            const now = new Date().toISOString();

            // Optimistic insertion.
            queryClient.setQueryData<ChatMessage[]>(
                orderChatQueryKey(orderId),
                (current) => {
                    const optimistic: ChatMessage = {
                        id: `optimistic:${clientId}`,
                        clientId,
                        orderId,
                        senderId: currentUserId ?? 'me',
                        senderRole: 'customer',
                        senderName: '',
                        content: trimmed,
                        createdAt: now,
                        pending: true,
                    };
                    return current ? [...current, optimistic] : [optimistic];
                },
            );
            pendingClientIds.current.set(clientId, trimmed);

            sendMutation.mutate(
                { content: trimmed },
                {
                    onSuccess: (server) => {
                        pendingClientIds.current.delete(clientId);
                        // Replace the optimistic row with the server row.
                        queryClient.setQueryData<ChatMessage[]>(
                            orderChatQueryKey(orderId),
                            (current) => {
                                if (!current) return [server];
                                const next = current.map((m) =>
                                    m.clientId === clientId
                                        ? { ...server, clientId }
                                        : m,
                                );
                                // Dedupe in case the WS event arrived first.
                                if (
                                    next.filter((m) => m.id === server.id).length > 1
                                ) {
                                    const seen = new Set<string>();
                                    return next.filter((m) => {
                                        if (seen.has(m.id)) return false;
                                        seen.add(m.id);
                                        return true;
                                    });
                                }
                                return next;
                            },
                        );
                    },
                    onError: () => {
                        // Flag the optimistic row as failed so the UI can offer a retry.
                        queryClient.setQueryData<ChatMessage[]>(
                            orderChatQueryKey(orderId),
                            (current) => {
                                if (!current) return current;
                                return current.map((m) =>
                                    m.clientId === clientId
                                        ? { ...m, pending: false, failed: true }
                                        : m,
                                );
                            },
                        );
                    },
                },
            );
        },
        [currentUserId, orderId, queryClient, sendMutation],
    );

    const retry = useCallback(
        (clientId: string) => {
            if (!orderId) return;
            const content = pendingClientIds.current.get(clientId);
            if (!content) return;
            queryClient.setQueryData<ChatMessage[]>(
                orderChatQueryKey(orderId),
                (current) =>
                    current?.map((m) =>
                        m.clientId === clientId
                            ? { ...m, pending: true, failed: false }
                            : m,
                    ),
            );
            sendMutation.mutate(
                { content },
                {
                    onSuccess: (server) => {
                        pendingClientIds.current.delete(clientId);
                        queryClient.setQueryData<ChatMessage[]>(
                            orderChatQueryKey(orderId),
                            (current) =>
                                current?.map((m) =>
                                    m.clientId === clientId
                                        ? { ...server, clientId }
                                        : m,
                                ),
                        );
                    },
                    onError: () => {
                        queryClient.setQueryData<ChatMessage[]>(
                            orderChatQueryKey(orderId),
                            (current) =>
                                current?.map((m) =>
                                    m.clientId === clientId
                                        ? { ...m, pending: false, failed: true }
                                        : m,
                                ),
                        );
                    },
                },
            );
        },
        [orderId, queryClient, sendMutation],
    );

    return {
        ...query,
        currentUserId,
        send,
        retry,
        isSending: sendMutation.isPending,
    };
};
