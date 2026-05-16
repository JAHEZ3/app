import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

export type SocketEventName =
    // canonical names used by callers
    | 'order:status:updated'
    | 'order:delivery:assigned'
    | 'delivery:location'
    | 'chat:new'
    // gateway-native names that we also surface for forward compatibility
    | 'order:status'
    | 'chat:message'
    | 'order:new'
    | 'order:joined'
    | 'order:left'
    | 'chat:typing'
    | 'restaurant:registered'
    | 'connected'
    | 'error'
    // pass-through for anything else
    | (string & {});

type Handler = (payload: unknown) => void;

interface JoinRoom {
    kind: 'order' | 'restaurant';
    id: string;
}

/**
 * Maps caller-friendly canonical event names to the names actually emitted by
 * the api-gateway. We register listeners on the gateway-native names and fan
 * out to both the native and canonical subscriber sets, so callers can pick
 * whichever spelling matches their docs.
 */
const EVENT_ALIASES: Record<string, string[]> = {
    'order:status': ['order:status:updated'],
    'chat:message': ['chat:new'],
};

const DEFAULT_URL = 'ws://localhost:3000';

class SocketService {
    private socket: Socket | null = null;
    private url: string = process.env.EXPO_PUBLIC_WS_URL ?? DEFAULT_URL;
    private token: string | null = null;
    private status: SocketStatus = 'idle';

    /** Event name → set of handler callbacks. Sets prevent duplicate listeners. */
    private listeners = new Map<string, Set<Handler>>();
    private statusListeners = new Set<(status: SocketStatus) => void>();

    /** Rooms the app wants to be in. Re-joined automatically after reconnect. */
    private desiredRooms = new Map<string, JoinRoom>();
    /** restaurantId we've registered with — re-sent after reconnect. */
    private restaurantId: string | null = null;

    private nativeEventsBound = new Set<string>();

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Connect (or reconnect with a fresh token). Idempotent: calling with the
     * same token while already open / connecting is a no-op.
     */
    connect(token: string) {
        if (!token) return;
        if (this.token === token && this.socket?.connected) return;

        // Token rotation while connected — tear down and rebuild so the gateway
        // re-authenticates with the new token.
        if (this.socket && this.token !== token) {
            this.teardown();
        }

        this.token = token;

        if (this.socket) {
            // Same token, socket exists but disconnected — let socket.io handle it.
            this.socket.connect();
            return;
        }

        this.setStatus('connecting');

        this.socket = io(this.url, {
            transports: ['websocket'],
            auth: { token },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1_000,
            reconnectionDelayMax: 30_000,
            randomizationFactor: 0.3,
            timeout: 10_000,
            forceNew: false,
        });

        this.bindLifecycleEvents(this.socket);
        // Re-bind any listeners callers registered before connect.
        for (const event of this.listeners.keys()) {
            this.bindNativeEvent(event);
        }
    }

    disconnect() {
        this.teardown();
        this.setStatus('closed');
    }

    private teardown() {
        if (!this.socket) return;
        try {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        } catch {
            /* ignore */
        }
        this.socket = null;
        this.token = null;
        this.nativeEventsBound.clear();
    }

    // ─── Listener API ───────────────────────────────────────────────────────

    /**
     * Subscribe to a server-emitted event. Returns an unsubscribe function.
     * Adding the same handler twice for the same event is a no-op (Set dedup).
     */
    on(event: SocketEventName, handler: Handler): () => void {
        const set = this.listeners.get(event) ?? new Set<Handler>();
        set.add(handler);
        this.listeners.set(event, set);
        this.bindNativeEvent(event);
        return () => this.off(event, handler);
    }

    off(event: SocketEventName, handler: Handler) {
        const set = this.listeners.get(event);
        if (!set) return;
        set.delete(handler);
        if (set.size === 0) this.listeners.delete(event);
    }

    onStatus(handler: (status: SocketStatus) => void): () => void {
        this.statusListeners.add(handler);
        handler(this.status);
        return () => {
            this.statusListeners.delete(handler);
        };
    }

    emit(event: string, data: unknown) {
        if (!this.socket || !this.socket.connected) {
            console.log('[socket] emit dropped — not connected', { event });
            return;
        }
        this.socket.emit(event, data);
    }

    getStatus(): SocketStatus {
        return this.status;
    }

    // ─── Room management ────────────────────────────────────────────────────

    /** Track + join an order room. Idempotent. Re-joined after reconnect. */
    joinOrder(orderId: string) {
        const key = `order:${orderId}`;
        if (this.desiredRooms.has(key)) return;
        this.desiredRooms.set(key, { kind: 'order', id: orderId });
        if (this.socket?.connected) {
            this.socket.emit('order:join', { orderId });
        }
    }

    leaveOrder(orderId: string) {
        const key = `order:${orderId}`;
        if (!this.desiredRooms.has(key)) return;
        this.desiredRooms.delete(key);
        if (this.socket?.connected) {
            this.socket.emit('order:leave', { orderId });
        }
    }

    /** For restaurant_owner / manager dashboards. */
    registerRestaurant(restaurantId: string) {
        this.restaurantId = restaurantId;
        if (this.socket?.connected) {
            this.socket.emit('restaurant:register', { restaurantId });
        }
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    private bindLifecycleEvents(socket: Socket) {
        socket.on('connect', () => {
            console.log('[socket] connected', { id: socket.id });
            this.setStatus('open');
            this.rejoinRooms();
        });

        socket.on('disconnect', (reason: string) => {
            console.log('[socket] disconnected', { reason });
            this.setStatus('closed');
        });

        socket.on('connect_error', (err: Error) => {
            console.log('[socket] connect_error', { message: err.message });
        });

        socket.io.on('reconnect_attempt', (attempt: number) => {
            console.log('[socket] reconnect_attempt', { attempt });
            this.setStatus('connecting');
        });

        socket.io.on('reconnect', (attempt: number) => {
            console.log('[socket] reconnected', { attempt });
            this.setStatus('open');
            // socket 'connect' will also fire and trigger rejoinRooms.
        });

        socket.io.on('reconnect_failed', () => {
            console.log('[socket] reconnect_failed');
            this.setStatus('closed');
        });
    }

    private bindNativeEvent(canonicalEvent: string) {
        if (!this.socket) return;

        // Map canonical → native if a reverse alias exists.
        const nativeEvent = Object.entries(EVENT_ALIASES).find(([, aliases]) =>
            aliases.includes(canonicalEvent),
        )?.[0] ?? canonicalEvent;

        if (this.nativeEventsBound.has(nativeEvent)) return;
        this.nativeEventsBound.add(nativeEvent);

        this.socket.on(nativeEvent, (payload: unknown) => {
            this.dispatch(nativeEvent, payload);
            // Also dispatch to canonical aliases if any.
            const aliases = EVENT_ALIASES[nativeEvent] ?? [];
            for (const alias of aliases) {
                this.dispatch(alias, payload);
            }
        });
    }

    private dispatch(event: string, payload: unknown) {
        const set = this.listeners.get(event);
        if (!set || set.size === 0) return;
        set.forEach((handler) => {
            try {
                handler(payload);
            } catch (err) {
                console.log(`[socket] handler for "${event}" threw`, err);
            }
        });
    }

    private rejoinRooms() {
        if (!this.socket?.connected) return;

        if (this.restaurantId) {
            this.socket.emit('restaurant:register', { restaurantId: this.restaurantId });
        }
        for (const room of this.desiredRooms.values()) {
            if (room.kind === 'order') {
                this.socket.emit('order:join', { orderId: room.id });
            }
        }
    }

    private setStatus(status: SocketStatus) {
        if (this.status === status) return;
        this.status = status;
        this.statusListeners.forEach((handler) => {
            try {
                handler(status);
            } catch {
                /* ignore */
            }
        });
    }
}

/** Module-scoped singleton — the only socket instance in the app. */
export const socketService = new SocketService();
