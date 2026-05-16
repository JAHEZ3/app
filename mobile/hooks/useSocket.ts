import { useEffect, useRef, useState } from 'react';
import {
    socketService,
    type SocketEventName,
    type SocketStatus,
} from '@/socket/socket.service';

/**
 * Subscribe to a single socket event. The handler is held in a ref so callers
 * can pass inline arrow functions without re-binding on every render.
 *
 * Handlers are deduplicated by reference at the service layer, so the same
 * `useSocketEvent` mounted twice with two different handlers will register
 * two listeners — but the same handler can never be registered twice.
 */
export function useSocketEvent<T = unknown>(
    event: SocketEventName,
    handler: (payload: T) => void,
    enabled: boolean = true,
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) return;
        const dispatch = (payload: unknown) => {
            handlerRef.current(payload as T);
        };
        const unsubscribe = socketService.on(event, dispatch);
        return unsubscribe;
    }, [event, enabled]);
}

/**
 * Join an order room for the lifetime of the component. Automatically leaves
 * on unmount and re-joins on reconnect.
 */
export function useJoinOrderRoom(orderId: string | undefined, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled || !orderId) return;
        socketService.joinOrder(orderId);
        return () => {
            socketService.leaveOrder(orderId);
        };
    }, [orderId, enabled]);
}

/**
 * Track the socket connection status (idle / connecting / open / closed).
 * Useful for showing a "Live" indicator in the UI.
 */
export function useSocketStatus(): SocketStatus {
    const [status, setStatus] = useState<SocketStatus>(() => socketService.getStatus());
    useEffect(() => socketService.onStatus(setStatus), []);
    return status;
}

/**
 * Imperative escape hatch — returns the singleton so callers can `.emit()`
 * or attach listeners outside of React (e.g. from a service).
 */
export function useSocket() {
    return socketService;
}
