import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useOrderRepository } from '..';

interface ApiErrorPayload {
    message?: string | string[];
}

export const getReceiptErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export type ReceiptFailureReason =
    | 'not_ready'
    | 'expired'
    | 'unauthorized'
    | 'network'
    | 'open_failed'
    | 'error';

export interface ReceiptOpenResult {
    ok: boolean;
    reason?: ReceiptFailureReason;
    message?: string | null;
}

const classifyError = (err: unknown): ReceiptFailureReason => {
    if (err instanceof AxiosError) {
        const status = err.response?.status ?? 0;
        // Most S3 / pre-signed URL hosts return 403 when the signature has
        // expired; some backends surface 410 Gone. We treat the gateway 401
        // separately so the caller can route to login if needed.
        if (status === 401) return 'unauthorized';
        if (status === 403 || status === 410) return 'expired';
        if (
            err.code === 'ERR_NETWORK' ||
            err.code === 'ECONNABORTED' ||
            !err.response
        ) {
            return 'network';
        }
    }
    return 'error';
};

export const useOrderReceipt = () => {
    const { getReceiptUrl } = useOrderRepository();
    const [lastUrl, setLastUrl] = useState<string | null>(null);

    const fetchMutation = useMutation<string | null, AxiosError, string>({
        mutationFn: (orderId) => getReceiptUrl(orderId),
        retry: 0,
    });

    /**
     * Opens the receipt in the in-app browser. Always re-fetches a fresh
     * pre-signed URL — `getReceiptUrl` is cheap on the server and any cached
     * URL would expire within minutes, so trusting a stale one would be a UX
     * footgun. The single retry happens only when the *first open* fails with
     * a network/expired error and the caller asks for it.
     */
    const openReceipt = useCallback(
        async (orderId: string): Promise<ReceiptOpenResult> => {
            try {
                const url = await fetchMutation.mutateAsync(orderId);
                if (!url) return { ok: false, reason: 'not_ready' };
                setLastUrl(url);
                try {
                    // `openBrowserAsync` shows a Chrome Custom Tab / Safari View
                    // Controller, which renders PDFs inline on both platforms
                    // without us shipping a PDF renderer.
                    await WebBrowser.openBrowserAsync(url, {
                        toolbarColor: '#F7F7F7',
                        controlsColor: '#F55905',
                        dismissButtonStyle: 'close',
                        readerMode: false,
                    });
                    return { ok: true };
                } catch {
                    // Some environments (Expo Go on certain devices) fail to
                    // open the in-app browser — fall back to the system handler.
                    try {
                        await Linking.openURL(url);
                        return { ok: true };
                    } catch {
                        return { ok: false, reason: 'open_failed' };
                    }
                }
            } catch (err) {
                return {
                    ok: false,
                    reason: classifyError(err),
                    message: getReceiptErrorMessage(err),
                };
            }
        },
        [fetchMutation],
    );

    return {
        openReceipt,
        isLoading: fetchMutation.isPending,
        error: fetchMutation.error,
        lastUrl,
    };
};
