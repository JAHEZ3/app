import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderRepository } from '..';
import type { PaymentProofAsset } from '../repository/OrderRepository';
import { ORDER_DETAILS_QUERY_KEY } from './useOrderDetails';

export const PAYMENT_PROOF_QUERY_KEY = ['order', 'payment-proof'] as const;

interface UploadVariables {
    orderId: string;
    file: PaymentProofAsset;
}

interface ApiErrorPayload {
    message?: string | string[];
}

export const getPaymentProofErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export const usePaymentProofUrl = (orderId: string | undefined, enabled = true) => {
    const { getPaymentProofUrl } = useOrderRepository();
    const isAuthed = useAuthStore((s) => s.status) === 'authenticated';

    return useQuery<string | null, AxiosError>({
        queryKey: [...PAYMENT_PROOF_QUERY_KEY, orderId],
        queryFn: () => getPaymentProofUrl(orderId as string),
        enabled: Boolean(orderId) && isAuthed && enabled,
        staleTime: 1000 * 30,
        retry: 0,
        refetchOnWindowFocus: false,
    });
};

export const useUploadPaymentProof = () => {
    const { uploadPaymentProof } = useOrderRepository();
    const queryClient = useQueryClient();

    return useMutation<void, AxiosError, UploadVariables>({
        mutationFn: ({ orderId, file }) => uploadPaymentProof(orderId, file),
        retry: 0,
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: [...PAYMENT_PROOF_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};
