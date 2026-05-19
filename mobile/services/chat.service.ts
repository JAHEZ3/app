import { AxiosError } from 'axios';
import { orderApi } from '@/lib/api';
import type {
    ChatMessage,
    ChatMessageDto,
    ChatMessagesResponse,
    ChatSendResponse,
} from '@/modules/Order/chat/types';

const ORDERS_URL = '/api/order/orders';

const chatUrl = (orderId: string) => `${ORDERS_URL}/${orderId}/chat`;

interface ApiErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

export const extractChatErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    if (err.code === 'ECONNABORTED') return 'انتهت مهلة الاتصال — تحقق من الشبكة';
    if (err.code === 'ERR_NETWORK') return 'تعذر الاتصال بالخادم';
    return err.message;
};

export const adaptChatMessage = (dto: ChatMessageDto): ChatMessage => ({
    id: dto.id,
    orderId: dto.orderId,
    senderId: dto.senderId,
    senderRole: dto.senderRole,
    senderName: dto.senderName,
    content: dto.content,
    createdAt: dto.createdAt,
});

export const ChatService = {
    getMessages: async (orderId: string): Promise<ChatMessage[]> => {
        const res = await orderApi.get<ChatMessagesResponse>(chatUrl(orderId));
        const list = res.data?.data ?? [];
        return list.map(adaptChatMessage);
    },

    sendMessage: async (
        orderId: string,
        content: string,
    ): Promise<ChatMessage> => {
        const res = await orderApi.post<ChatSendResponse>(chatUrl(orderId), {
            content,
        });
        if (!res.data?.data) {
            throw new Error('Empty chat response');
        }
        return adaptChatMessage(res.data.data);
    },
};

export default ChatService;
