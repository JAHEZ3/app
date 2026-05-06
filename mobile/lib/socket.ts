type SocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

type Handler = (payload: unknown) => void;

interface IncomingMessage {
    event: string;
    data?: unknown;
    payload?: unknown;
}

const DEFAULT_URL = 'ws://localhost:3000';
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

class RealtimeSocket {
    private ws: WebSocket | null = null;
    private url: string = process.env.EXPO_PUBLIC_WS_URL ?? DEFAULT_URL;
    private token: string | null = null;
    private listeners = new Map<string, Set<Handler>>();
    private statusListeners = new Set<(status: SocketStatus) => void>();
    private status: SocketStatus = 'idle';
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private intentionallyClosed = false;

    connect(token: string) {
        if (this.token === token && (this.status === 'open' || this.status === 'connecting')) {
            return;
        }

        this.token = token;
        this.intentionallyClosed = false;
        this.openSocket();
    }

    disconnect() {
        this.intentionallyClosed = true;
        this.token = null;
        this.clearReconnectTimer();
        if (this.ws) {
            try {
                this.ws.close(1000, 'client disconnect');
            } catch {
                // noop
            }
        }
        this.ws = null;
        this.setStatus('closed');
        this.reconnectAttempts = 0;
    }

    addListener(event: string, handler: Handler): () => void {
        const set = this.listeners.get(event) ?? new Set<Handler>();
        set.add(handler);
        this.listeners.set(event, set);
        return () => {
            set.delete(handler);
            if (set.size === 0) this.listeners.delete(event);
        };
    }

    onStatusChange(handler: (status: SocketStatus) => void): () => void {
        this.statusListeners.add(handler);
        handler(this.status);
        return () => {
            this.statusListeners.delete(handler);
        };
    }

    send(event: string, data: unknown) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('[ws] send dropped — socket not open', { event });
            return;
        }
        try {
            this.ws.send(JSON.stringify({ event, data }));
        } catch (err) {
            console.log('[ws] send failed', err);
        }
    }

    getStatus(): SocketStatus {
        return this.status;
    }

    private openSocket() {
        this.clearReconnectTimer();

        if (!this.token) {
            console.log('[ws] no token — skipping connect');
            return;
        }

        const target = this.buildUrl(this.token);
        console.log('[ws] connecting', { url: this.maskToken(target) });
        this.setStatus('connecting');

        try {
            this.ws = new WebSocket(target);
        } catch (err) {
            console.log('[ws] construct failed', err);
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log('[ws] open');
            this.reconnectAttempts = 0;
            this.setStatus('open');
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onerror = (event) => {
            console.log('[ws] error', event);
        };

        this.ws.onclose = (event) => {
            console.log('[ws] close', { code: event.code, reason: event.reason });
            this.ws = null;
            this.setStatus('closed');
            if (!this.intentionallyClosed) {
                this.scheduleReconnect();
            }
        };
    }

    private handleMessage(raw: unknown) {
        if (typeof raw !== 'string') return;
        let parsed: IncomingMessage | null = null;
        try {
            parsed = JSON.parse(raw) as IncomingMessage;
        } catch {
            console.log('[ws] non-JSON message dropped');
            return;
        }
        if (!parsed?.event) return;

        const payload = parsed.data ?? parsed.payload;
        const set = this.listeners.get(parsed.event);
        if (!set || set.size === 0) return;

        set.forEach((handler) => {
            try {
                handler(payload);
            } catch (err) {
                console.log(`[ws] listener for "${parsed?.event}" threw`, err);
            }
        });
    }

    private scheduleReconnect() {
        if (this.intentionallyClosed) return;
        if (!this.token) return;

        const delay = Math.min(
            BASE_BACKOFF_MS * 2 ** this.reconnectAttempts,
            MAX_BACKOFF_MS,
        );
        this.reconnectAttempts += 1;
        console.log('[ws] reconnect scheduled', {
            attempt: this.reconnectAttempts,
            delayMs: delay,
        });
        this.reconnectTimer = setTimeout(() => {
            this.openSocket();
        }, delay);
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private setStatus(status: SocketStatus) {
        if (this.status === status) return;
        this.status = status;
        this.statusListeners.forEach((handler) => {
            try {
                handler(status);
            } catch {
                // noop
            }
        });
    }

    private buildUrl(token: string): string {
        const sep = this.url.includes('?') ? '&' : '?';
        return `${this.url}${sep}token=${encodeURIComponent(token)}`;
    }

    private maskToken(url: string): string {
        return url.replace(/token=[^&]+/, 'token=***');
    }
}

export const realtimeSocket = new RealtimeSocket();

export type { SocketStatus };
