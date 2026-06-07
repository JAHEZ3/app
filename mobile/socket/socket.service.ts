import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

/**
 * Error events that bubble up to UI subscribers. We deliberately keep this
 * limited to **terminal, user-actionable** failures from the gateway:
 *
 *   - `AUTH_FAILED`       — token rejected; user needs to re-login
 *   - `ACCOUNT_INACTIVE`  — account suspended/banned; show a status screen
 *
 * Transient network failures (`connect_error`, `reconnect_failed`) are
 * logged to the console only. The HTTP API is independent of the socket,
 * so the app stays fully functional while the socket retries / gives up.
 * `CONNECT_ERROR` / `GAVE_UP` are kept in the union for backwards
 * compatibility with any external dispatcher, but the service no longer
 * fires them itself.
 */
export interface SocketError {
    code:
        | 'AUTH_FAILED'
        | 'ACCOUNT_INACTIVE'
        | 'CONNECT_ERROR'
        | 'GAVE_UP'
        | (string & {});
    message: string;
}

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

const DEFAULT_URL = process.env.EXPO_PUBLIC_WS_URL ?? '';

class SocketService {
    private socket: Socket | null = null;
    private url: string = DEFAULT_URL;
    private token: string | null = null;
    private status: SocketStatus = 'idle';

    /** Event name → set of handler callbacks. Sets prevent duplicate listeners. */
    private listeners = new Map<string, Set<Handler>>();
    private statusListeners = new Set<(status: SocketStatus) => void>();
    /** Subscribers for the server-emitted `error` event + connect_error. */
    private errorListeners = new Set<(err: SocketError) => void>();
    /** Most recent error so a late-subscribing UI can render the previous failure. */
    private lastError: SocketError | null = null;
    /** Counter for consecutive failed connect attempts. Resets on successful
     *  connect. Used to throttle the log spam — we want to know about the
     *  *first* failure clearly, not see it 17 times. */
    private consecutiveFailures = 0;

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

        // Skip silently if no WS URL is configured — prevents pointless
        // reconnect loops against ws://localhost:3000 on a physical device.
        if (!this.url) {
            console.log('[socket] EXPO_PUBLIC_WS_URL is not set — socket disabled');
            return;
        }

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

        // Start with HTTP long-polling so the session handshake succeeds even
        // when the gateway sits behind a reverse-proxy that blocks raw WebSocket
        // upgrades. socket.io automatically upgrades the session to WebSocket
        // in the background once the polling session is established — this is
        // the same order the restaurant dashboard uses and is why that socket
        // connects reliably while ['websocket', 'polling'] times out on device.
        this.socket = io(this.url, {
            transports: ['polling', 'websocket'],
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1_000,
            reconnectionDelayMax: 30_000,
            randomizationFactor: 0.3,
            timeout: 8_000,
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

    /**
     * Subscribe to gateway-emitted `error` events and `connect_error` failures.
     * Returns an unsubscribe function. New subscribers are immediately notified
     * with the last error (if any) so a screen mounted *after* the failure
     * still gets a chance to surface it.
     */
    onError(handler: (err: SocketError) => void): () => void {
        this.errorListeners.add(handler);
        if (this.lastError) handler(this.lastError);
        return () => {
            this.errorListeners.delete(handler);
        };
    }

    /** Clear the cached error after the UI has shown / acknowledged it. */
    clearError() {
        this.lastError = null;
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
            // A successful connect clears any prior auth/connect failure so the
            // UI banner stops shouting after a recovery.
            this.lastError = null;
            this.consecutiveFailures = 0;
            this.rejoinRooms();
        });

        socket.on('disconnect', (reason: string) => {
            console.log('[socket] disconnected', { reason });
            this.setStatus('closed');
        });

        socket.on('connect_error', (err: Error) => {
            this.consecutiveFailures += 1;
            // Log first failure + every 5th retry, but DO NOT dispatch to
            // error subscribers while the socket is still retrying. The HTTP
            // API is unaffected, the app keeps running, and the UI shouldn't
            // shout an error banner that will resolve itself in a few seconds.
            // The terminal `reconnect_failed` event handles GAVE_UP for us.
            if (
                this.consecutiveFailures === 1 ||
                this.consecutiveFailures % 5 === 0
            ) {
                console.log('[socket] connect_error (retrying silently)', {
                    message: err.message,
                    attempt: this.consecutiveFailures,
                });
            }
        });

        // Server-emitted error from the gateway. Today this fires for
        // AUTH_FAILED (bad/expired token) and ACCOUNT_INACTIVE (suspended user).
        // The gateway calls `disconnect(true)` immediately after, so this is
        // the only chance to surface the reason — without this listener the
        // failure is completely invisible to the UI.
        socket.on('error', (payload: unknown) => {
            const err = this.coerceError(payload);
            console.log('[socket] gateway error', err);
            this.dispatchError(err);
        });

        socket.io.on('reconnect_attempt', (attempt: number) => {
            // Same throttling as connect_error so the two streams don't fight
            // for log space. Status update still happens every attempt so the
            // UI "connecting…" indicator stays accurate.
            if (attempt === 1 || attempt % 5 === 0) {
                console.log('[socket] reconnect_attempt', { attempt });
            }
            this.setStatus('connecting');
        });

        socket.io.on('reconnect', (attempt: number) => {
            console.log('[socket] reconnected', { attempt });
            this.setStatus('open');
            // socket 'connect' will also fire and trigger rejoinRooms.
        });

        socket.io.on('reconnect_failed', () => {
            // Logged for diagnostics only — NO user-visible banner.
            // The HTTP API still works; the app is fully usable without sockets,
            // so a network/gateway timeout shouldn't bother the user. They can
            // pull-to-refresh to recover when connectivity is back, or restart
            // the app for a clean retry.
            console.log('[socket] reconnect_failed — giving up silently (HTTP still works)');
            this.setStatus('closed');
        });
    }

    /**
     * Manual reconnect — called by the UI's "Retry" button after we gave up.
     * Resets the socket.io retry counter by rebuilding the connection with
     * the cached token.
     */
    reconnect() {
        if (!this.token) return;
        this.consecutiveFailures = 0;
        this.lastError = null;
        if (this.socket) {
            this.teardown();
        }
        const token = this.token;
        this.token = null; // force the connect() path to create a fresh socket
        this.connect(token);
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

    /** Normalize whatever shape the gateway sent into a typed `SocketError`. */
    private coerceError(payload: unknown): SocketError {
        if (payload && typeof payload === 'object') {
            const p = payload as { code?: unknown; message?: unknown };
            return {
                code: typeof p.code === 'string' ? p.code : 'UNKNOWN',
                message:
                    typeof p.message === 'string' && p.message
                        ? p.message
                        : 'تعذر الاتصال بخدمة التتبع',
            };
        }
        return { code: 'UNKNOWN', message: 'تعذر الاتصال بخدمة التتبع' };
    }

    private dispatchError(err: SocketError) {
        // Only cache terminal errors so newly-mounted screens don't inherit a
        // stale CONNECT_ERROR (which is transient — the socket is still retrying).
        const isTerminal =
            err.code === 'GAVE_UP' ||
            err.code === 'AUTH_FAILED' ||
            err.code === 'ACCOUNT_INACTIVE';
        if (isTerminal) {
            this.lastError = err;
        }
        this.errorListeners.forEach((handler) => {
            try {
                handler(err);
            } catch {
                /* ignore */
            }
        });
    }
}

/** Module-scoped singleton used by the customer-side of the app. */
export const socketService = new SocketService();

/**
 * Separate socket instance for delivery agents. Connects with the delivery
 * access token (useDeliveryStore) rather than the customer token, so the
 * gateway authenticates the agent correctly and routes `delivery:location`
 * events to the right rooms.
 */
export const deliverySocketService = new SocketService();
