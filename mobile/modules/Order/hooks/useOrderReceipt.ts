import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Linking } from 'react-native';
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

export const useOrderReceipt = () => {
    const { getReceiptUrl } = useOrderRepository();

    const mutation = useMutation<string | null, AxiosError, string>({
        mutationFn: (orderId) => getReceiptUrl(orderId),
        retry: 0,
    });

    const openReceipt = useCallback(
        async (orderId: string): Promise<{ ok: boolean; reason?: 'not_ready' | 'open_failed' | 'error'; message?: string | null }> => {
            try {
                const url = await mutation.mutateAsync(orderId);
                if (!url) return { ok: false, reason: 'not_ready' };
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) return { ok: false, reason: 'open_failed' };
                await Linking.openURL(url);
                return { ok: true };
            } catch (err) {
                return { ok: false, reason: 'error', message: getReceiptErrorMessage(err) };
            }
        },
        [mutation],
    );

    return {
        openReceipt,
        isLoading: mutation.isPending,
        error: mutation.error,
    };
};
