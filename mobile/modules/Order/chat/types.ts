export type ChatSenderRole = 'customer' | 'restaurant' | 'delivery' | 'manager';

/** Server-shape (raw chat_messages row). Numeric/text fields aligned with backend. */
export interface ChatMessageDto {
    id: string;
    orderId: string;
    senderId: string;
    senderRole: ChatSenderRole | string;
    senderName: string;
    content: string;
    isArchived?: boolean;
    createdAt: string;
}

/** Mobile-side model. Adds `pending`/`failed` for optimistic UI. */
export interface ChatMessage {
    id: string;
    /** A client-generated UUID kept until the server response arrives; used for dedupe. */
    clientId?: string;
    orderId: string;
    senderId: string;
    senderRole: ChatSenderRole | string;
    senderName: string;
    content: string;
    createdAt: string;
    /** True while the message is queued and waiting for the server response. */
    pending?: boolean;
    /** True when the send failed and the user should retry. */
    failed?: boolean;
}

export interface ChatMessagesResponse {
    data: ChatMessageDto[];
    message?: string | null;
}

export interface ChatSendResponse {
    data: ChatMessageDto;
    message?: string | null;
}

export interface TypingEvent {
    userId: string;
    role: ChatSenderRole | string;
    isTyping: boolean;
}
