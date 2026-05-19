/**
 * Minimal JWT payload decoder — no signature verification (the server is the
 * source of truth). Only used to derive the local userId for "is this my
 * message?" comparisons in the chat UI.
 */

interface JwtPayload {
    sub?: string;
    role?: string;
    phone?: string;
    fullName?: string;
    [key: string]: unknown;
}

const base64UrlDecode = (input: string): string => {
    const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof globalThis.atob === 'function') {
        return globalThis.atob(b64);
    }
    // RN doesn't always expose atob in Hermes; this fallback handles ASCII-safe
    // JWT payloads (which is what we need — sub is a UUID).
    const buffer: Uint8Array | undefined =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        typeof (globalThis as { Buffer?: { from: (s: string, enc: string) => Uint8Array } }).Buffer !==
        'undefined'
            ? (globalThis as { Buffer: { from: (s: string, enc: string) => Uint8Array } }).Buffer.from(b64, 'base64')
            : undefined;
    if (buffer) return new TextDecoder().decode(buffer);
    return '';
};

export const decodeJwt = (token: string | null | undefined): JwtPayload | null => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const json = base64UrlDecode(parts[1]);
        if (!json) return null;
        return JSON.parse(json) as JwtPayload;
    } catch {
        return null;
    }
};

export const getUserIdFromToken = (token: string | null | undefined): string | null => {
    const payload = decodeJwt(token);
    return payload?.sub ?? null;
};
