import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/socket/socket.service';
import type { TypingEvent } from './types';

interface UseTypingIndicatorArgs {
    orderId: string | undefined;
    /** Local user id (so we ignore our own echoes). */
    currentUserId: string | null;
    /** Disable the whole indicator (e.g. order closed). */
    enabled?: boolean;
    /** How long after the last typing event we consider the peer "stopped". */
    inactivityMs?: number;
    /** Cooldown between our own typing emits to avoid flooding the socket. */
    emitThrottleMs?: number;
}

interface UseTypingIndicatorResult {
    /** True when *another* participant is currently typing. */
    isPeerTyping: boolean;
    /** Display name of the typing peer (best-effort — depends on role/sender info). */
    peerLabel: string | null;
    /** Call on every keystroke; the hook throttles the emit. */
    notifyTyping: () => void;
    /** Call on send / unmount to immediately flip the indicator off. */
    notifyStoppedTyping: () => void;
}

const isTypingEvent = (data: unknown): data is TypingEvent => {
    if (!data || typeof data !== 'object') return false;
    const o = data as Record<string, unknown>;
    return (
        typeof o.userId === 'string' &&
        typeof o.role === 'string' &&
        typeof o.isTyping === 'boolean'
    );
};

const ROLE_LABEL: Record<string, string> = {
    restaurant: 'Restaurant',
    restaurant_owner: 'Restaurant',
    delivery: 'Driver',
    manager: 'Support',
    customer: 'Customer',
};

export const useTypingIndicator = ({
    orderId,
    currentUserId,
    enabled = true,
    inactivityMs = 3_500,
    emitThrottleMs = 1_500,
}: UseTypingIndicatorArgs): UseTypingIndicatorResult => {
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const [peerLabel, setPeerLabel] = useState<string | null>(null);

    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEmitTs = useRef(0);
    const lastWasTyping = useRef(false);

    // Subscribe to chat:typing events for this order.
    useEffect(() => {
        if (!enabled || !orderId) return;
        const off = socketService.on('chat:typing', (payload) => {
            if (!isTypingEvent(payload)) return;
            if (payload.userId === currentUserId) return; // ignore our own echo

            if (payload.isTyping) {
                setIsPeerTyping(true);
                setPeerLabel(ROLE_LABEL[payload.role] ?? null);
                if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
                inactivityTimer.current = setTimeout(() => {
                    setIsPeerTyping(false);
                }, inactivityMs);
            } else {
                if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
                setIsPeerTyping(false);
            }
        });
        return () => {
            off();
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
                inactivityTimer.current = null;
            }
        };
    }, [orderId, enabled, currentUserId, inactivityMs]);

    const sendTyping = useCallback(
        (isTyping: boolean) => {
            if (!orderId) return;
            socketService.emit('chat:typing', { orderId, isTyping });
        },
        [orderId],
    );

    const notifyTyping = useCallback(() => {
        if (!enabled || !orderId) return;
        const now = Date.now();
        if (lastWasTyping.current && now - lastEmitTs.current < emitThrottleMs) {
            return;
        }
        lastEmitTs.current = now;
        lastWasTyping.current = true;
        sendTyping(true);
    }, [enabled, orderId, emitThrottleMs, sendTyping]);

    const notifyStoppedTyping = useCallback(() => {
        if (!enabled || !orderId) return;
        if (!lastWasTyping.current) return;
        lastWasTyping.current = false;
        sendTyping(false);
    }, [enabled, orderId, sendTyping]);

    // Flush "stopped" on unmount so peers don't see a stale typing indicator.
    useEffect(() => {
        return () => {
            if (lastWasTyping.current && orderId) {
                socketService.emit('chat:typing', { orderId, isTyping: false });
                lastWasTyping.current = false;
            }
        };
    }, [orderId]);

    return { isPeerTyping, peerLabel, notifyTyping, notifyStoppedTyping };
};
